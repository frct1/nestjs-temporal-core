/**
 * Client certificate pair for TLS
 */
export interface ClientCertPair {
  crt: Buffer;
  key: Buffer;
}

/**
 * TLS configuration options
 */
export interface TlsOptions {
  clientCertPair: ClientCertPair;
}

/**
 * Basic connection configuration
 */
export interface ConnectionOptions {
  address: string;
  tls?: TlsOptions;
}
