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
 * Basic connection configuration for Temporal server
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
    tls?: TlsOptions | boolean;

    /**
     * Connection timeout in milliseconds
     * @default 5000
     */
    connectionTimeout?: number;

    /**
     * API key for Temporal Cloud (if applicable)
     */
    apiKey?: string;

    /**
     * Optional HTTP headers to send with each request to the server
     */
    metadata?: Record<string, string>;

    /**
     * HTTP CONNECT proxy configuration for connecting through firewalls
     */
    proxy?: {
        /**
         * Target host for the proxy
         * Format: "host:port"
         */
        targetHost: string;

        /**
         * Basic authentication for the proxy (if required)
         */
        basicAuth?: {
            username: string;
            password: string;
        };
    };
}
