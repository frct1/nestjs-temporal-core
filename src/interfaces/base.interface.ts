/**
 * Client certificate pair for TLS
 */
export interface ClientCertPair {
    /**
     * Certificate file content as Buffer
     */
    crt: Buffer;

    /**
     * Key file content as Buffer
     */
    key: Buffer;

    /**
     * Certificate authority (optional)
     */
    ca?: Buffer;
}

/**
 * TLS configuration options
 */
export interface TlsOptions {
    /**
     * Client certificate pair for TLS authentication
     */
    clientCertPair: ClientCertPair;

    /**
     * Server name for SNI (optional)
     */
    serverName?: string;

    /**
     * Whether to verify the server certificate
     * @default true
     */
    verifyServer?: boolean;
}

/**
 * Basic connection configuration
 */
export interface ConnectionOptions {
    /**
     * Temporal server address
     * Format: "host:port"
     * @example "localhost:7233"
     */
    address: string;

    /**
     * TLS configuration (optional)
     * If provided, connection will use TLS
     */
    tls?: TlsOptions;

    /**
     * Connection timeout in milliseconds
     * @default 5000
     */
    connectionTimeout?: number;
}
