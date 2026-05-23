import { VertexAI } from '@google-cloud/vertexai'
import { Storage } from '@google-cloud/storage'
import { parseGcpServiceAccountKey } from '@/lib/vertex-ai/gcp-credentials'

const projectId = process.env.GCP_PROJECT_ID
const region = process.env.GCP_REGION
const bucketName = process.env.GCP_BUCKET_CHUNKS

let credentials: object | undefined
let vertexAIInstance: VertexAI | undefined
let gcsStorageInstance: Storage | undefined
let chunksBucketInstance: ReturnType<Storage['bucket']> | undefined

function requireGcpEnv(): {
  projectId: string
  region: string
  bucketName: string
  credentials: object
} {
  if (!projectId || !region || !bucketName) {
    throw new Error(
      'Missing GCP env vars: GCP_PROJECT_ID, GCP_REGION, GCP_BUCKET_CHUNKS',
    )
  }
  if (!credentials) {
    credentials = parseGcpServiceAccountKey()
  }
  return { projectId, region, bucketName, credentials }
}

export function getVertexAI(): VertexAI {
  if (!vertexAIInstance) {
    const cfg = requireGcpEnv()
    vertexAIInstance = new VertexAI({
      project: cfg.projectId,
      location: cfg.region,
      googleAuthOptions: { credentials: cfg.credentials },
    })
  }
  return vertexAIInstance
}

export function getGcsStorage(): Storage {
  if (!gcsStorageInstance) {
    const cfg = requireGcpEnv()
    gcsStorageInstance = new Storage({
      projectId: cfg.projectId,
      credentials: cfg.credentials,
    })
  }
  return gcsStorageInstance
}

export function getChunksBucket() {
  if (!chunksBucketInstance) {
    const cfg = requireGcpEnv()
    chunksBucketInstance = getGcsStorage().bucket(cfg.bucketName)
  }
  return chunksBucketInstance
}

export const gcpProjectId = projectId ?? ''
export const gcpRegion = region ?? ''
export const gcsChunksBucketName = bucketName ?? ''
