import { gunzipSync } from 'node:zlib';
import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Collection, MongoClient } from 'mongodb';

import {
  ComprobanteGuardado,
  ComprobantesPort,
  FiltroComprobantes,
  ResumenComprobante,
} from '../../domain/ports/comprobantes.port';

interface ReferenciaArchivo {
  proveedor: string;
  bucket: string;
  key: string;
}

interface DocIntento {
  claveAcceso: string;
  estado?: string;
  archivos?: { xmlFirmado?: string; xmlArchivado?: ReferenciaArchivo };
  autorizacion?: { numero?: string; fecha?: string };
}

async function streamABuffer(stream: any): Promise<Buffer> {
  const partes: Buffer[] = [];
  for await (const parte of stream) partes.push(Buffer.isBuffer(parte) ? parte : Buffer.from(parte));
  return Buffer.concat(partes);
}

interface DocComprobante {
  _id: string;
  // En Mongo la empresa se guarda como empresaId: es el RUC.
  empresaId: string;
  tipo: string;
  estado: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  creadoEn: Date;
  intentos: DocIntento[];
  // Lo anota el Nucleo cuando comprueba que el RIDE se puede armar.
  ride?: { generadoEn?: Date; bytes?: number; logoVersion?: number | null };
}

// Solo lectura: el unico que escribe en comprobantes es el Nucleo.
@Injectable()
export class MongoComprobantesRepository implements ComprobantesPort, OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(MongoComprobantesRepository.name);
  private readonly cliente: MongoClient;
  private readonly comprobantes: Collection<DocComprobante>;
  // Puede no venir configurado: en ese caso un comprobante archivado
  // simplemente no se puede leer (igual que antes de esta funcionalidad).
  private readonly archivo: S3Client | null;

  constructor(
    url: string,
    s3Url?: string,
    s3KeyId?: string,
    s3Secret?: string,
  ) {
    this.cliente = new MongoClient(url, { maxPoolSize: 5 });
    this.comprobantes = this.cliente.db().collection<DocComprobante>('comprobantes');
    this.archivo = s3Url
      ? new S3Client({
          endpoint: s3Url,
          region: 'garage',
          forcePathStyle: true,
          credentials: { accessKeyId: s3KeyId ?? '', secretAccessKey: s3Secret ?? '' },
        })
      : null;
  }

  // El XML firmado real. Si ya se archivo (ver Archivo/archivar-uno.mjs), el
  // texto ya no esta en Mongo: se trae comprimido del almacen propio.
  private async resolverXmlFirmado(intento: DocIntento | undefined): Promise<string | null> {
    if (intento?.archivos?.xmlFirmado) return intento.archivos.xmlFirmado;

    const referencia = intento?.archivos?.xmlArchivado;
    if (!referencia || !this.archivo) return null;

    const respuesta = await this.archivo.send(new GetObjectCommand({ Bucket: referencia.bucket, Key: referencia.key }));
    const comprimido = await streamABuffer(respuesta.Body);
    return gunzipSync(comprimido).toString('utf8');
  }

  async onModuleInit(): Promise<void> {
    await this.cliente.connect();
    this.logger.log(JSON.stringify({ evento: 'mongo_conectado' }));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.cliente.close();
  }

  async buscarPorClave(claveAcceso: string): Promise<ComprobanteGuardado | null> {
    const doc = await this.comprobantes.findOne({ 'intentos.claveAcceso': claveAcceso });
    if (!doc) return null;

    // Un comprobante reprocesado tiene varios intentos, cada uno con su
    // clave: interesa el de esta clave.
    const intento = doc.intentos.filter((i) => i.claveAcceso === claveAcceso).at(-1);

    return {
      claveAcceso,
      empresaRuc: doc.empresaId,
      tipo: doc.tipo,
      estado: intento?.estado ?? doc.estado,
      numero: `${doc.estab}-${doc.ptoEmi}-${doc.secuencial}`,
      xmlFirmado: await this.resolverXmlFirmado(intento),
      numeroAutorizacion: intento?.autorizacion?.numero ?? null,
      fechaAutorizacion: intento?.autorizacion?.fecha ?? null,
    };
  }

  async listar(filtro: FiltroComprobantes): Promise<ResumenComprobante[]> {
    const docs = await this.comprobantes
      .find({
        estado: 'AUTORIZADO',
        ...(filtro.empresaRuc ? { empresaId: filtro.empresaRuc } : {}),
        creadoEn: { $gte: filtro.desde, $lt: filtro.hasta },
      })
      .sort({ creadoEn: -1 })
      .limit(filtro.limite)
      .toArray();

    return docs.map((doc) => {
      const intento = doc.intentos.at(-1);
      return {
        claveAcceso: intento?.claveAcceso ?? '',
        empresaRuc: doc.empresaId,
        numero: `${doc.estab}-${doc.ptoEmi}-${doc.secuencial}`,
        estado: doc.estado,
        autorizadoEn: intento?.autorizacion?.fecha ?? null,
        rideGeneradoEn: doc.ride?.generadoEn ?? null,
        bytes: doc.ride?.bytes ?? null,
        logoVersion: doc.ride?.logoVersion ?? null,
      };
    });
  }
}
