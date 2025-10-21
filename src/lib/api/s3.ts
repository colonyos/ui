import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envConfig } from '$lib/config/env';

export interface S3Object {
	key: string;
	size: number;
	lastModified: Date;
	etag?: string;
	isFolder: boolean;
}

export interface S3ListResult {
	objects: S3Object[];
	prefixes: string[];
	continuationToken?: string;
}

export class S3ClientWrapper {
	private client: S3Client;
	private bucket: string;

	constructor() {
		const endpoint = envConfig.awsS3Endpoint;
		const region = envConfig.awsS3Region;
		const accessKeyId = envConfig.awsS3Accesskey;
		const secretAccessKey = envConfig.awsS3Secretkey;
		const forcePathStyle = !!endpoint; // Use path-style for custom endpoints
		const tls = envConfig.awsS3TLS === 'true';

		this.bucket = envConfig.awsS3Bucket;

		// Build the endpoint URL
		let endpointUrl = endpoint;
		if (endpoint && !endpoint.startsWith('http')) {
			endpointUrl = `${tls ? 'https' : 'http'}://${endpoint}`;
		}

		this.client = new S3Client({
			region: region || 'us-east-1',
			credentials: {
				accessKeyId: accessKeyId || '',
				secretAccessKey: secretAccessKey || ''
			},
			endpoint: endpointUrl || undefined,
			forcePathStyle: forcePathStyle,
			tls: tls
		});
	}

	/**
	 * List objects in the bucket with optional prefix (folder path)
	 */
	async listObjects(prefix: string = '', continuationToken?: string): Promise<S3ListResult> {
		const command = new ListObjectsV2Command({
			Bucket: this.bucket,
			Prefix: prefix,
			Delimiter: '/', // Use delimiter to group by folders
			MaxKeys: 1000,
			ContinuationToken: continuationToken
		});

		const response = await this.client.send(command);

		const objects: S3Object[] = (response.Contents || []).map(obj => ({
			key: obj.Key || '',
			size: obj.Size || 0,
			lastModified: obj.LastModified || new Date(),
			etag: obj.ETag,
			isFolder: false
		}));

		const prefixes = (response.CommonPrefixes || []).map(p => p.Prefix || '');

		return {
			objects,
			prefixes,
			continuationToken: response.NextContinuationToken
		};
	}

	/**
	 * Get a presigned URL for downloading an object
	 */
	async getDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: key
		});

		return await getSignedUrl(this.client, command, { expiresIn });
	}

	/**
	 * Get object metadata
	 */
	async getObjectMetadata(key: string): Promise<any> {
		const command = new HeadObjectCommand({
			Bucket: this.bucket,
			Key: key
		});

		const response = await this.client.send(command);
		return {
			size: response.ContentLength,
			lastModified: response.LastModified,
			contentType: response.ContentType,
			etag: response.ETag,
			metadata: response.Metadata
		};
	}

	/**
	 * Download an object as a blob
	 */
	async downloadObject(key: string): Promise<Blob> {
		const command = new GetObjectCommand({
			Bucket: this.bucket,
			Key: key
		});

		const response = await this.client.send(command);

		if (!response.Body) {
			throw new Error('No body in response');
		}

		// Convert the stream to a blob
		const stream = response.Body as ReadableStream;
		const reader = stream.getReader();
		const chunks: Uint8Array[] = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
		}

		return new Blob(chunks, { type: response.ContentType });
	}

	/**
	 * Upload an object to the bucket
	 */
	async uploadObject(key: string, body: Blob | string, contentType?: string): Promise<void> {
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: body instanceof Blob ? await body.arrayBuffer() : body,
			ContentType: contentType
		});

		await this.client.send(command);
	}

	/**
	 * Delete an object from the bucket
	 */
	async deleteObject(key: string): Promise<void> {
		const command = new DeleteObjectCommand({
			Bucket: this.bucket,
			Key: key
		});

		await this.client.send(command);
	}

	/**
	 * Check if S3 is configured
	 */
	isConfigured(): boolean {
		return !!(
			envConfig.awsS3Endpoint &&
			envConfig.awsS3Accesskey &&
			envConfig.awsS3Secretkey &&
			envConfig.awsS3Bucket
		);
	}

	/**
	 * Get the bucket name
	 */
	getBucketName(): string {
		return this.bucket;
	}
}

// Export a singleton instance
export const s3Client = new S3ClientWrapper();
