# 🍳 Examples & Recipes

Practical examples and common patterns for using NestJS Temporal Core in real-world applications.

## Table of Contents

- [🍳 Examples \& Recipes](#-examples--recipes)
  - [Table of Contents](#table-of-contents)
  - [E-commerce Order Processing](#e-commerce-order-processing)
    - [Order Activities](#order-activities)
    - [Order Workflow Controller](#order-workflow-controller)
    - [Order Service](#order-service)
  - [Payment Processing with Compensation](#payment-processing-with-compensation)
    - [Payment Activities](#payment-activities)
    - [Payment Workflow Controller](#payment-workflow-controller)
  - [Data Pipeline with ETL](#data-pipeline-with-etl)
    - [Data Pipeline Activities](#data-pipeline-activities)
    - [Data Pipeline Workflow Controller](#data-pipeline-workflow-controller)
  - [User Onboarding Journey](#user-onboarding-journey)
    - [Onboarding Activities](#onboarding-activities)
    - [Onboarding Workflow Controller](#onboarding-workflow-controller)
  - [Scheduled Reports and Analytics](#scheduled-reports-and-analytics)
    - [Reports Workflow Controller](#reports-workflow-controller)
  - [Health Monitoring](#health-monitoring)
    - [Health Monitoring Workflow Controller](#health-monitoring-workflow-controller)

## E-commerce Order Processing

A comprehensive order processing system with inventory checks, payment processing, and fulfillment.

### Order Activities

```typescript
// src/activities/order.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface OrderItem {
    productId: string;
    quantity: number;
    price: number;
}

export interface Order {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    totalAmount: number;
    status: string;
}

@Injectable()
@Activity()
export class OrderActivities {
    
    @ActivityMethod()
    async validateOrder(order: Order): Promise<boolean> {
        console.log(`Validating order ${order.orderId}`);
        // Validate order data, customer info, etc.
        return order.items.length > 0 && order.totalAmount > 0;
    }
    
    @ActivityMethod()
    async checkInventory(items: OrderItem[]): Promise<boolean> {
        console.log('Checking inventory for items:', items);
        // Check if all items are in stock
        for (const item of items) {
            const available = await this.getAvailableQuantity(item.productId);
            if (available < item.quantity) {
                return false;
            }
        }
        return true;
    }
    
    @ActivityMethod()
    async reserveInventory(items: OrderItem[]): Promise<string> {
        console.log('Reserving inventory for items:', items);
        // Reserve items in inventory system
        const reservationId = `res_${Date.now()}`;
        // Implementation...
        return reservationId;
    }
    
    @ActivityMethod()
    async processPayment(orderId: string, amount: number, customerId: string): Promise<string> {
        console.log(`Processing payment for order ${orderId}: $${amount}`);
        // Process payment through payment gateway
        const paymentId = `pay_${Date.now()}`;
        // Implementation...
        return paymentId;
    }
    
    @ActivityMethod()
    async fulfillOrder(orderId: string, items: OrderItem[]): Promise<string> {
        console.log(`Fulfilling order ${orderId}`);
        // Create shipping label, pack items, etc.
        const trackingNumber = `track_${Date.now()}`;
        // Implementation...
        return trackingNumber;
    }
    
    @ActivityMethod()
    async sendOrderConfirmation(orderId: string, customerId: string, trackingNumber: string): Promise<void> {
        console.log(`Sending confirmation for order ${orderId} to customer ${customerId}`);
        // Send email with tracking information
    }
    
    @ActivityMethod()
    async compensateInventory(reservationId: string): Promise<void> {
        console.log(`Compensating inventory reservation ${reservationId}`);
        // Release reserved inventory
    }
    
    @ActivityMethod()
    async refundPayment(paymentId: string): Promise<void> {
        console.log(`Refunding payment ${paymentId}`);
        // Process refund
    }
    
    private async getAvailableQuantity(productId: string): Promise<number> {
        // Mock implementation
        return Math.floor(Math.random() * 100) + 10;
    }
}
```

### Order Workflow Controller

```typescript
// src/workflows/order.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';
import { Order, OrderItem } from '../activities/order.activities';

interface OrderActivities {
    validateOrder(order: Order): Promise<boolean>;
    checkInventory(items: OrderItem[]): Promise<boolean>;
    reserveInventory(items: OrderItem[]): Promise<string>;
    processPayment(orderId: string, amount: number, customerId: string): Promise<string>;
    fulfillOrder(orderId: string, items: OrderItem[]): Promise<string>;
    sendOrderConfirmation(orderId: string, customerId: string, trackingNumber: string): Promise<void>;
    compensateInventory(reservationId: string): Promise<void>;
    refundPayment(paymentId: string): Promise<void>;
}

const activities = proxyActivities<OrderActivities>({
    startToCloseTimeout: '2m',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 1000,
        maximumIntervalMs: 10000,
    },
});

@WorkflowController({ taskQueue: 'orders' })
export class OrderWorkflowController {
    private status = 'pending';
    private reservationId?: string;
    private paymentId?: string;
    private trackingNumber?: string;
    private error?: string;
    
    @WorkflowMethod()
    async processOrder(order: Order): Promise<string> {
        try {
            this.status = 'validating';
            
            // Step 1: Validate order
            const isValid = await activities.validateOrder(order);
            if (!isValid) {
                throw new Error('Order validation failed');
            }
            
            this.status = 'checking-inventory';
            
            // Step 2: Check inventory
            const inventoryAvailable = await activities.checkInventory(order.items);
            if (!inventoryAvailable) {
                throw new Error('Insufficient inventory');
            }
            
            this.status = 'reserving-inventory';
            
            // Step 3: Reserve inventory
            this.reservationId = await activities.reserveInventory(order.items);
            
            this.status = 'processing-payment';
            
            // Step 4: Process payment
            this.paymentId = await activities.processPayment(
                order.orderId,
                order.totalAmount,
                order.customerId
            );
            
            this.status = 'fulfilling';
            
            // Step 5: Fulfill order
            this.trackingNumber = await activities.fulfillOrder(order.orderId, order.items);
            
            this.status = 'confirming';
            
            // Step 6: Send confirmation
            await activities.sendOrderConfirmation(
                order.orderId,
                order.customerId,
                this.trackingNumber
            );
            
            this.status = 'completed';
            return this.trackingNumber;
            
        } catch (error) {
            this.error = error.message;
            this.status = 'compensating';
            
            // Compensation logic
            if (this.paymentId) {
                await activities.refundPayment(this.paymentId);
            }
            
            if (this.reservationId) {
                await activities.compensateInventory(this.reservationId);
            }
            
            this.status = 'failed';
            throw error;
        }
    }
    
    @Signal('cancelOrder')
    async cancelOrder(): Promise<void> {
        if (this.status === 'completed') {
            throw new Error('Cannot cancel completed order');
        }
        
        this.status = 'cancelling';
        
        // Perform compensation
        if (this.paymentId) {
            await activities.refundPayment(this.paymentId);
        }
        
        if (this.reservationId) {
            await activities.compensateInventory(this.reservationId);
        }
        
        this.status = 'cancelled';
    }
    
    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }
    
    @Query('getTrackingNumber')
    getTrackingNumber(): string | undefined {
        return this.trackingNumber;
    }
    
    @Query('getError')
    getError(): string | undefined {
        return this.error;
    }
}
```

### Order Service

```typescript
// src/services/order.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';
import { Order } from '../activities/order.activities';

@Injectable()
export class OrderService {
    constructor(private readonly temporalService: TemporalService) {}
    
    async createOrder(order: Order): Promise<{ workflowId: string; trackingNumber?: string }> {
        const workflowId = `order-${order.orderId}`;
        
        try {
            const { result } = await this.temporalService.startWorkflow(
                'processOrder',
                [order],
                {
                    workflowId,
                    searchAttributes: {
                        'customer-id': order.customerId,
                        'order-amount': order.totalAmount,
                    },
                }
            );
            
            const trackingNumber = await result;
            return { workflowId, trackingNumber };
            
        } catch (error) {
            console.error(`Order processing failed for ${order.orderId}:`, error);
            throw error;
        }
    }
    
    async cancelOrder(orderId: string): Promise<void> {
        const workflowId = `order-${orderId}`;
        await this.temporalService.signalWorkflow(workflowId, 'cancelOrder');
    }
    
    async getOrderStatus(orderId: string): Promise<{
        status: string;
        trackingNumber?: string;
        error?: string;
    }> {
        const workflowId = `order-${orderId}`;
        
        try {
            const [status, trackingNumber, error] = await Promise.all([
                this.temporalService.queryWorkflow(workflowId, 'getStatus'),
                this.temporalService.queryWorkflow(workflowId, 'getTrackingNumber'),
                this.temporalService.queryWorkflow(workflowId, 'getError'),
            ]);
            
            return { status, trackingNumber, error };
        } catch (error) {
            throw new Error(`Failed to get order status: ${error.message}`);
        }
    }
}
```

## Payment Processing with Compensation

A robust payment system with saga pattern for distributed transactions.

### Payment Activities

```typescript
// src/activities/payment.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface PaymentRequest {
    paymentId: string;
    amount: number;
    currency: string;
    customerId: string;
    paymentMethod: string;
}

@Injectable()
@Activity()
export class PaymentActivities {
    
    @ActivityMethod()
    async validatePayment(request: PaymentRequest): Promise<boolean> {
        console.log(`Validating payment ${request.paymentId}`);
        // Validate payment details
        return request.amount > 0 && request.currency && request.customerId;
    }
    
    @ActivityMethod()
    async authorizePayment(request: PaymentRequest): Promise<string> {
        console.log(`Authorizing payment ${request.paymentId}`);
        // Authorize payment with payment provider
        const authId = `auth_${Date.now()}`;
        
        // Simulate potential failure
        if (Math.random() < 0.1) {
            throw new Error('Payment authorization failed');
        }
        
        return authId;
    }
    
    @ActivityMethod()
    async capturePayment(authId: string, amount: number): Promise<string> {
        console.log(`Capturing payment ${authId} for amount ${amount}`);
        // Capture the authorized payment
        const captureId = `cap_${Date.now()}`;
        
        // Simulate potential failure
        if (Math.random() < 0.05) {
            throw new Error('Payment capture failed');
        }
        
        return captureId;
    }
    
    @ActivityMethod()
    async updateAccountBalance(customerId: string, amount: number): Promise<void> {
        console.log(`Updating account balance for customer ${customerId} by ${amount}`);
        // Update customer account balance
        
        // Simulate potential failure
        if (Math.random() < 0.05) {
            throw new Error('Account update failed');
        }
    }
    
    @ActivityMethod()
    async sendPaymentConfirmation(customerId: string, paymentId: string): Promise<void> {
        console.log(`Sending payment confirmation to customer ${customerId}`);
        // Send confirmation email/SMS
    }
    
    @ActivityMethod()
    async voidAuthorization(authId: string): Promise<void> {
        console.log(`Voiding authorization ${authId}`);
        // Void the payment authorization
    }
    
    @ActivityMethod()
    async refundPayment(captureId: string, amount: number): Promise<string> {
        console.log(`Refunding payment ${captureId} for amount ${amount}`);
        // Process refund
        const refundId = `ref_${Date.now()}`;
        return refundId;
    }
    
    @ActivityMethod()
    async compensateAccountBalance(customerId: string, amount: number): Promise<void> {
        console.log(`Compensating account balance for customer ${customerId} by ${amount}`);
        // Reverse the account balance update
    }
}
```

### Payment Workflow Controller

```typescript
// src/workflows/payment.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';
import { PaymentRequest } from '../activities/payment.activities';

interface PaymentActivities {
    validatePayment(request: PaymentRequest): Promise<boolean>;
    authorizePayment(request: PaymentRequest): Promise<string>;
    capturePayment(authId: string, amount: number): Promise<string>;
    updateAccountBalance(customerId: string, amount: number): Promise<void>;
    sendPaymentConfirmation(customerId: string, paymentId: string): Promise<void>;
    voidAuthorization(authId: string): Promise<void>;
    refundPayment(captureId: string, amount: number): Promise<string>;
    compensateAccountBalance(customerId: string, amount: number): Promise<void>;
}

const activities = proxyActivities<PaymentActivities>({
    startToCloseTimeout: '1m',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 500,
        maximumIntervalMs: 5000,
    },
});

@WorkflowController({ taskQueue: 'payments' })
export class PaymentWorkflowController {
    private status = 'pending';
    private authId?: string;
    private captureId?: string;
    private accountUpdated = false;
    private error?: string;
    
    @WorkflowMethod()
    async processPayment(request: PaymentRequest): Promise<{ status: string; captureId?: string }> {
        try {
            this.status = 'validating';
            
            // Step 1: Validate payment
            const isValid = await activities.validatePayment(request);
            if (!isValid) {
                throw new Error('Payment validation failed');
            }
            
            this.status = 'authorizing';
            
            // Step 2: Authorize payment
            this.authId = await activities.authorizePayment(request);
            
            this.status = 'capturing';
            
            // Step 3: Capture payment
            this.captureId = await activities.capturePayment(this.authId, request.amount);
            
            this.status = 'updating-account';
            
            // Step 4: Update account balance
            await activities.updateAccountBalance(request.customerId, -request.amount);
            this.accountUpdated = true;
            
            this.status = 'confirming';
            
            // Step 5: Send confirmation
            await activities.sendPaymentConfirmation(request.customerId, request.paymentId);
            
            this.status = 'completed';
            return { status: 'success', captureId: this.captureId };
            
        } catch (error) {
            this.error = error.message;
            this.status = 'compensating';
            
            // Compensation logic (Saga pattern)
            await this.compensate(request);
            
            this.status = 'failed';
            throw error;
        }
    }
    
    private async compensate(request: PaymentRequest): Promise<void> {
        try {
            // Reverse operations in opposite order
            
            // 1. Compensate account balance if it was updated
            if (this.accountUpdated) {
                await activities.compensateAccountBalance(request.customerId, request.amount);
            }
            
            // 2. Refund captured payment
            if (this.captureId) {
                await activities.refundPayment(this.captureId, request.amount);
            }
            
            // 3. Void authorization if it exists
            if (this.authId) {
                await activities.voidAuthorization(this.authId);
            }
            
        } catch (compensationError) {
            console.error('Compensation failed:', compensationError);
            // In real scenarios, this might trigger manual intervention
        }
    }
    
    @Signal('cancelPayment')
    async cancelPayment(request: PaymentRequest): Promise<void> {
        if (this.status === 'completed') {
            throw new Error('Cannot cancel completed payment');
        }
        
        this.status = 'cancelling';
        await this.compensate(request);
        this.status = 'cancelled';
    }
    
    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }
    
    @Query('getCaptureId')
    getCaptureId(): string | undefined {
        return this.captureId;
    }
    
    @Query('getError')
    getError(): string | undefined {
        return this.error;
    }
}
```

## Data Pipeline with ETL

A data processing pipeline with Extract, Transform, Load operations.

### Data Pipeline Activities

```typescript
// src/activities/data-pipeline.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface DataSource {
    type: 'csv' | 'json' | 'database' | 'api';
    location: string;
    credentials?: any;
}

export interface TransformationConfig {
    rules: TransformationRule[];
    outputFormat: 'json' | 'csv' | 'parquet';
}

export interface TransformationRule {
    field: string;
    operation: 'map' | 'filter' | 'aggregate' | 'join';
    parameters: any;
}

@Injectable()
@Activity()
export class DataPipelineActivities {
    
    @ActivityMethod()
    async extractData(source: DataSource): Promise<{ data: any[]; recordCount: number }> {
        console.log(`Extracting data from ${source.type}: ${source.location}`);
        
        // Simulate data extraction
        const data = this.simulateDataExtraction(source);
        
        return {
            data,
            recordCount: data.length
        };
    }
    
    @ActivityMethod()
    async validateData(data: any[], schema: any): Promise<{ valid: boolean; errors: string[] }> {
        console.log(`Validating ${data.length} records against schema`);
        
        const errors: string[] = [];
        
        // Simulate validation
        for (let i = 0; i < data.length; i++) {
            if (Math.random() < 0.01) { // 1% error rate
                errors.push(`Record ${i}: Invalid data format`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    @ActivityMethod()
    async transformData(data: any[], config: TransformationConfig): Promise<any[]> {
        console.log(`Transforming ${data.length} records with ${config.rules.length} rules`);
        
        let transformedData = [...data];
        
        // Apply transformation rules
        for (const rule of config.rules) {
            transformedData = this.applyTransformationRule(transformedData, rule);
        }
        
        return transformedData;
    }
    
    @ActivityMethod()
    async loadData(data: any[], destination: string): Promise<{ success: boolean; loadedCount: number }> {
        console.log(`Loading ${data.length} records to ${destination}`);
        
        // Simulate data loading with potential failures
        const failureRate = 0.05; // 5% failure rate
        
        if (Math.random() < failureRate) {
            throw new Error('Data loading failed due to connection timeout');
        }
        
        return {
            success: true,
            loadedCount: data.length
        };
    }
    
    @ActivityMethod()
    async createDataQualityReport(data: any[]): Promise<{
        totalRecords: number;
        nullValues: number;
        duplicates: number;
        qualityScore: number;
    }> {
        console.log(`Creating data quality report for ${data.length} records`);
        
        // Simulate quality analysis
        const nullValues = Math.floor(data.length * 0.02); // 2% null values
        const duplicates = Math.floor(data.length * 0.01); // 1% duplicates
        const qualityScore = Math.max(0, 100 - (nullValues / data.length * 100) - (duplicates / data.length * 100));
        
        return {
            totalRecords: data.length,
            nullValues,
            duplicates,
            qualityScore
        };
    }
    
    @ActivityMethod()
    async sendPipelineNotification(status: string, details: any): Promise<void> {
        console.log(`Sending pipeline notification: ${status}`, details);
        // Send notification via email, Slack, etc.
    }
    
    private simulateDataExtraction(source: DataSource): any[] {
        // Simulate extracting data based on source type
        const recordCount = Math.floor(Math.random() * 10000) + 1000;
        const data = [];
        
        for (let i = 0; i < recordCount; i++) {
            data.push({
                id: i + 1,
                name: `Record ${i + 1}`,
                value: Math.random() * 1000,
                timestamp: new Date(),
                category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
            });
        }
        
        return data;
    }
    
    private applyTransformationRule(data: any[], rule: TransformationRule): any[] {
        // Simulate applying transformation rules
        switch (rule.operation) {
            case 'filter':
                return data.filter(record => record[rule.field] > rule.parameters.threshold);
            case 'map':
                return data.map(record => ({
                    ...record,
                    [rule.field]: record[rule.field] * rule.parameters.multiplier
                }));
            default:
                return data;
        }
    }
}
```

### Data Pipeline Workflow Controller

```typescript
// src/workflows/data-pipeline.controller.ts
import { WorkflowController, WorkflowMethod, Cron, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';
import { DataSource, TransformationConfig } from '../activities/data-pipeline.activities';

interface DataPipelineActivities {
    extractData(source: DataSource): Promise<{ data: any[]; recordCount: number }>;
    validateData(data: any[], schema: any): Promise<{ valid: boolean; errors: string[] }>;
    transformData(data: any[], config: TransformationConfig): Promise<any[]>;
    loadData(data: any[], destination: string): Promise<{ success: boolean; loadedCount: number }>;
    createDataQualityReport(data: any[]): Promise<any>;
    sendPipelineNotification(status: string, details: any): Promise<void>;
}

const activities = proxyActivities<DataPipelineActivities>({
    startToCloseTimeout: '10m', // Data operations can take longer
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 2000,
        maximumIntervalMs: 30000,
    },
});

@WorkflowController({ taskQueue: 'data-pipeline' })
export class DataPipelineController {
    private status = 'pending';
    private extractedCount = 0;
    private transformedCount = 0;
    private loadedCount = 0;
    private qualityReport: any = null;
    private errors: string[] = [];
    
    @WorkflowMethod()
    async runPipeline(
        source: DataSource,
        transformConfig: TransformationConfig,
        destination: string,
        schema?: any
    ): Promise<{ success: boolean; processedRecords: number; qualityReport: any }> {
        try {
            this.status = 'extracting';
            
            // Step 1: Extract data
            const { data: extractedData, recordCount } = await activities.extractData(source);
            this.extractedCount = recordCount;
            
            // Step 2: Validate data (if schema provided)
            if (schema) {
                this.status = 'validating';
                const validation = await activities.validateData(extractedData, schema);
                
                if (!validation.valid) {
                    this.errors = validation.errors;
                    await activities.sendPipelineNotification('validation_failed', {
                        errors: validation.errors
                    });
                    throw new Error(`Data validation failed: ${validation.errors.length} errors found`);
                }
            }
            
            this.status = 'transforming';
            
            // Step 3: Transform data
            const transformedData = await activities.transformData(extractedData, transformConfig);
            this.transformedCount = transformedData.length;
            
            this.status = 'loading';
            
            // Step 4: Load data
            const loadResult = await activities.loadData(transformedData, destination);
            this.loadedCount = loadResult.loadedCount;
            
            this.status = 'reporting';
            
            // Step 5: Create quality report
            this.qualityReport = await activities.createDataQualityReport(transformedData);
            
            this.status = 'completed';
            
            // Send success notification
            await activities.sendPipelineNotification('success', {
                extractedRecords: this.extractedCount,
                transformedRecords: this.transformedCount,
                loadedRecords: this.loadedCount,
                qualityReport: this.qualityReport
            });
            
            return {
                success: true,
                processedRecords: this.loadedCount,
                qualityReport: this.qualityReport
            };
            
        } catch (error) {
            this.status = 'failed';
            this.errors.push(error.message);
            
            await activities.sendPipelineNotification('failed', {
                error: error.message,
                extractedRecords: this.extractedCount,
                transformedRecords: this.transformedCount,
                loadedRecords: this.loadedCount
            });
            
            throw error;
        }
    }
    
    @Cron('0 2 * * *', {
        scheduleId: 'daily-data-pipeline',
        description: 'Daily data pipeline execution'
    })
    @WorkflowMethod()
    async runDailyPipeline(): Promise<void> {
        const source: DataSource = {
            type: 'database',
            location: 'daily_transactions',
            credentials: { /* ... */ }
        };
        
        const transformConfig: TransformationConfig = {
            rules: [
                {
                    field: 'amount',
                    operation: 'filter',
                    parameters: { threshold: 0 }
                },
                {
                    field: 'amount',
                    operation: 'map',
                    parameters: { multiplier: 1.1 } // Apply 10% markup
                }
            ],
            outputFormat: 'json'
        };
        
        await this.runPipeline(
            source,
            transformConfig,
            'processed_daily_transactions'
        );
    }
    
    @Signal('pausePipeline')
    async pausePipeline(): Promise<void> {
        if (this.status === 'completed' || this.status === 'failed') {
            throw new Error('Cannot pause completed or failed pipeline');
        }
        
        this.status = 'paused';
        await activities.sendPipelineNotification('paused', { pausedAt: new Date() });
    }
    
    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }
    
    @Query('getProgress')
    getProgress(): {
        extractedCount: number;
        transformedCount: number;
        loadedCount: number;
    } {
        return {
            extractedCount: this.extractedCount,
            transformedCount: this.transformedCount,
            loadedCount: this.loadedCount
        };
    }
    
    @Query('getQualityReport')
    getQualityReport(): any {
        return this.qualityReport;
    }
    
    @Query('getErrors')
    getErrors(): string[] {
        return this.errors;
    }
}
```

## User Onboarding Journey

A multi-step user onboarding process with timeouts and human tasks.

### Onboarding Activities

```typescript
// src/activities/onboarding.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface User {
    userId: string;
    email: string;
    name: string;
    phoneNumber?: string;
}

export interface OnboardingStep {
    stepName: string;
    completed: boolean;
    completedAt?: Date;
}

@Injectable()
@Activity()
export class OnboardingActivities {
    
    @ActivityMethod()
    async sendWelcomeEmail(user: User): Promise<boolean> {
        console.log(`Sending welcome email to ${user.email}`);
        // Send welcome email with onboarding instructions
        return true;
    }
    
    @ActivityMethod()
    async sendVerificationEmail(user: User): Promise<string> {
        console.log(`Sending verification email to ${user.email}`);
        // Send email verification link
        const verificationToken = `verify_${Date.now()}`;
        return verificationToken;
    }
    
    @ActivityMethod()
    async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
        console.log(`Sending SMS to ${phoneNumber}: ${message}`);
        // Send SMS notification
        return true;
    }
    
    @ActivityMethod()
    async createUserProfile(user: User): Promise<string> {
        console.log(`Creating profile for user ${user.userId}`);
        // Create user profile in database
        const profileId = `profile_${user.userId}`;
        return profileId;
    }
    
    @ActivityMethod()
    async assignUserToSegment(userId: string): Promise<string> {
        console.log(`Assigning user ${userId} to marketing segment`);
        // Analyze user data and assign to appropriate segment
        const segments = ['new_user', 'power_user', 'enterprise'];
        const segment = segments[Math.floor(Math.random() * segments.length)];
        return segment;
    }
    
    @ActivityMethod()
    async sendPersonalizedContent(userId: string, segment: string): Promise<void> {
        console.log(`Sending personalized content to user ${userId} in segment ${segment}`);
        // Send personalized onboarding content based on segment
    }
    
    @ActivityMethod()
    async scheduleFollowUpEmail(userId: string, delayHours: number): Promise<string> {
        console.log(`Scheduling follow-up email for user ${userId} in ${delayHours} hours`);
        // Schedule follow-up email
        const scheduleId = `followup_${userId}_${Date.now()}`;
        return scheduleId;
    }
    
    @ActivityMethod()
    async trackOnboardingEvent(userId: string, event: string, properties: any): Promise<void> {
        console.log(`Tracking event ${event} for user ${userId}`, properties);
        // Track analytics event
    }
    
    @ActivityMethod()
    async sendOnboardingReminder(user: User, stepName: string): Promise<void> {
        console.log(`Sending onboarding reminder to ${user.email} for step: ${stepName}`);
        // Send reminder email about incomplete onboarding step
    }
    
    @ActivityMethod()
    async sendOnboardingCompletion(user: User): Promise<void> {
        console.log(`Sending onboarding completion notification to ${user.email}`);
        // Send congratulations email with next steps
    }
}
```

### Onboarding Workflow Controller

```typescript
// src/workflows/onboarding.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities, sleep, condition } from '@temporalio/workflow';
import { User, OnboardingStep } from '../activities/onboarding.activities';

interface OnboardingActivities {
    sendWelcomeEmail(user: User): Promise<boolean>;
    sendVerificationEmail(user: User): Promise<string>;
    sendSMS(phoneNumber: string, message: string): Promise<boolean>;
    createUserProfile(user: User): Promise<string>;
    assignUserToSegment(userId: string): Promise<string>;
    sendPersonalizedContent(userId: string, segment: string): Promise<void>;
    scheduleFollowUpEmail(userId: string, delayHours: number): Promise<string>;
    trackOnboardingEvent(userId: string, event: string, properties: any): Promise<void>;
    sendOnboardingReminder(user: User, stepName: string): Promise<void>;
    sendOnboardingCompletion(user: User): Promise<void>;
}

const activities = proxyActivities<OnboardingActivities>({
    startToCloseTimeout: '5m',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 1000,
        maximumIntervalMs: 10000,
    },
});

@WorkflowController({ taskQueue: 'onboarding' })
export class OnboardingController {
    private status = 'started';
    private emailVerified = false;
    private profileCreated = false;
    private contentViewed = false;
    private steps: OnboardingStep[] = [
        { stepName: 'email_verification', completed: false },
        { stepName: 'profile_creation', completed: false },
        { stepName: 'content_viewing', completed: false },
    ];
    private segment?: string;
    
    @WorkflowMethod()
    async onboardUser(user: User): Promise<{ completed: boolean; segment: string }> {
        try {
            this.status = 'welcome';
            
            // Step 1: Send welcome email
            await activities.sendWelcomeEmail(user);
            await activities.trackOnboardingEvent(user.userId, 'welcome_sent', {});
            
            this.status = 'email_verification';
            
            // Step 2: Send verification email and wait
            const verificationToken = await activities.sendVerificationEmail(user);
            await activities.trackOnboardingEvent(user.userId, 'verification_sent', {});
            
            // Wait for email verification (max 24 hours)
            const emailVerified = await condition(() => this.emailVerified, '24h');
            
            if (!emailVerified) {
                // Send reminder and wait another 24 hours
                await activities.sendOnboardingReminder(user, 'email_verification');
                await condition(() => this.emailVerified, '24h');
                
                if (!this.emailVerified) {
                    this.status = 'abandoned';
                    await activities.trackOnboardingEvent(user.userId, 'onboarding_abandoned', {
                        step: 'email_verification'
                    });
                    return { completed: false, segment: 'abandoned' };
                }
            }
            
            this.steps[0].completed = true;
            this.steps[0].completedAt = new Date();
            await activities.trackOnboardingEvent(user.userId, 'email_verified', {});
            
            this.status = 'profile_creation';
            
            // Step 3: Create user profile
            const profileId = await activities.createUserProfile(user);
            this.profileCreated = true;
            this.steps[1].completed = true;
            this.steps[1].completedAt = new Date();
            await activities.trackOnboardingEvent(user.userId, 'profile_created', { profileId });
            
            this.status = 'segmentation';
            
            // Step 4: Assign to segment and send personalized content
            this.segment = await activities.assignUserToSegment(user.userId);
            await activities.sendPersonalizedContent(user.userId, this.segment);
            await activities.trackOnboardingEvent(user.userId, 'personalized_content_sent', {
                segment: this.segment
            });
            
            this.status = 'waiting_engagement';
            
            // Step 5: Wait for content engagement (max 7 days)
            const contentViewed = await condition(() => this.contentViewed, '7d');
            
            if (!contentViewed) {
                // Send follow-up emails
                await activities.scheduleFollowUpEmail(user.userId, 24);
                await sleep('24h');
                
                if (!this.contentViewed) {
                    await activities.scheduleFollowUpEmail(user.userId, 72);
                    await sleep('72h');
                    
                    if (!this.contentViewed) {
                        this.status = 'low_engagement';
                        await activities.trackOnboardingEvent(user.userId, 'low_engagement', {});
                        // Continue onboarding but mark as low engagement
                    }
                }
            }
            
            if (this.contentViewed) {
                this.steps[2].completed = true;
                this.steps[2].completedAt = new Date();
                await activities.trackOnboardingEvent(user.userId, 'content_viewed', {});
            }
            
            this.status = 'completed';
            
            // Send completion notification
            await activities.sendOnboardingCompletion(user);
            await activities.trackOnboardingEvent(user.userId, 'onboarding_completed', {
                segment: this.segment,
                completedSteps: this.steps.filter(s => s.completed).length,
                totalSteps: this.steps.length
            });
            
            return { completed: true, segment: this.segment || 'default' };
            
        } catch (error) {
            this.status = 'failed';
            await activities.trackOnboardingEvent(user.userId, 'onboarding_failed', {
                error: error.message
            });
            throw error;
        }
    }
    
    @Signal('emailVerified')
    async confirmEmailVerification(): Promise<void> {
        this.emailVerified = true;
    }
    
    @Signal('contentViewed')
    async confirmContentViewing(contentId: string): Promise<void> {
        this.contentViewed = true;
        await activities.trackOnboardingEvent('current_user', 'content_viewed', { contentId });
    }
    
    @Signal('phoneVerified')
    async confirmPhoneVerification(phoneNumber: string): Promise<void> {
        await activities.trackOnboardingEvent('current_user', 'phone_verified', { phoneNumber });
    }
    
    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }
    
    @Query('getProgress')
    getProgress(): {
        completedSteps: number;
        totalSteps: number;
        steps: OnboardingStep[];
    } {
        return {
            completedSteps: this.steps.filter(s => s.completed).length,
            totalSteps: this.steps.length,
            steps: this.steps
        };
    }
    
    @Query('getSegment')
    getSegment(): string | undefined {
        return this.segment;
    }
}
```

## Scheduled Reports and Analytics

Automated report generation with multiple output formats and distribution.

### Reports Workflow Controller

```typescript
// src/workflows/reports.controller.ts
import { WorkflowController, WorkflowMethod, Cron, Query } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';
import { CRON_EXPRESSIONS } from 'nestjs-temporal-core';

interface ReportActivities {
    generateSalesReport(period: string): Promise<{ reportId: string; recordCount: number }>;
    generateUserAnalytics(period: string): Promise<{ reportId: string; userCount: number }>;
    generateFinancialReport(period: string): Promise<{ reportId: string; revenue: number }>;
    exportToCSV(reportId: string): Promise<string>;
    exportToPDF(reportId: string): Promise<string>;
    uploadToS3(filePath: string, bucket: string): Promise<string>;
    sendReportEmail(recipients: string[], reportUrl: string, reportType: string): Promise<void>;
    postToSlack(channel: string, message: string): Promise<void>;
    archiveOldReports(retentionDays: number): Promise<number>;
}

const activities = proxyActivities<ReportActivities>({
    startToCloseTimeout: '15m',
    retry: {
        maximumAttempts: 2,
        initialIntervalMs: 5000,
        maximumIntervalMs: 30000,
    },
});

@WorkflowController({ taskQueue: 'reports' })
export class ReportsController {
    private lastReportGenerated?: string;
    private totalReportsGenerated = 0;
    private lastError?: string;
    
    @Cron(CRON_EXPRESSIONS.DAILY_8AM, {
        scheduleId: 'daily-sales-report',
        description: 'Generate daily sales report',
        timezone: 'America/New_York'
    })
    @WorkflowMethod()
    async generateDailySalesReport(): Promise<void> {
        try {
            const { reportId, recordCount } = await activities.generateSalesReport('daily');
            
            // Export to multiple formats
            const csvPath = await activities.exportToCSV(reportId);
            const pdfPath = await activities.exportToPDF(reportId);
            
            // Upload to cloud storage
            const csvUrl = await activities.uploadToS3(csvPath, 'reports-bucket');
            const pdfUrl = await activities.uploadToS3(pdfPath, 'reports-bucket');
            
            // Distribute report
            await activities.sendReportEmail(
                ['sales@company.com', 'management@company.com'],
                pdfUrl,
                'Daily Sales Report'
            );
            
            await activities.postToSlack(
                '#sales',
                `📊 Daily sales report is ready! ${recordCount} transactions processed. View: ${csvUrl}`
            );
            
            this.lastReportGenerated = reportId;
            this.totalReportsGenerated++;
            
        } catch (error) {
            this.lastError = error.message;
            await activities.postToSlack('#alerts', `❌ Daily sales report failed: ${error.message}`);
            throw error;
        }
    }
    
    @Cron('0 9 * * 1', {
        scheduleId: 'weekly-analytics-report',
        description: 'Generate weekly user analytics report'
    })
    @WorkflowMethod()
    async generateWeeklyAnalytics(): Promise<void> {
        try {
            const { reportId, userCount } = await activities.generateUserAnalytics('weekly');
            
            const pdfPath = await activities.exportToPDF(reportId);
            const pdfUrl = await activities.uploadToS3(pdfPath, 'reports-bucket');
            
            await activities.sendReportEmail(
                ['analytics@company.com', 'product@company.com'],
                pdfUrl,
                'Weekly User Analytics'
            );
            
            this.totalReportsGenerated++;
            
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }
    
    @Cron('0 0 1 * *', {
        scheduleId: 'monthly-financial-report',
        description: 'Generate monthly financial report'
    })
    @WorkflowMethod()
    async generateMonthlyFinancialReport(): Promise<void> {
        try {
            const { reportId, revenue } = await activities.generateFinancialReport('monthly');
            
            const pdfPath = await activities.exportToPDF(reportId);
            const pdfUrl = await activities.uploadToS3(pdfPath, 'reports-bucket');
            
            await activities.sendReportEmail(
                ['finance@company.com', 'ceo@company.com'],
                pdfUrl,
                'Monthly Financial Report'
            );
            
            this.totalReportsGenerated++;
            
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }
    
    @Cron('0 2 1 */3 *', {
        scheduleId: 'quarterly-cleanup',
        description: 'Clean up old reports quarterly'
    })
    @WorkflowMethod()
    async cleanupOldReports(): Promise<void> {
        try {
            const deletedCount = await activities.archiveOldReports(90); // Keep 90 days
            
            await activities.postToSlack(
                '#ops',
                `🧹 Quarterly cleanup completed. Archived ${deletedCount} old reports.`
            );
            
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }
    
    @Query('getLastReport')
    getLastReport(): string | undefined {
        return this.lastReportGenerated;
    }
    
    @Query('getTotalReports')
    getTotalReports(): number {
        return this.totalReportsGenerated;
    }
    
    @Query('getLastError')
    getLastError(): string | undefined {
        return this.lastError;
    }
}
```

## Health Monitoring

System health monitoring with alerting and auto-remediation.

### Health Monitoring Workflow Controller

```typescript
// src/workflows/health-monitoring.controller.ts
import { WorkflowController, WorkflowMethod, Interval, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities, sleep } from '@temporalio/workflow';

interface HealthCheckActivities {
    checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number }>;
    checkApiHealth(endpoint: string): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }>;
    checkQueueHealth(): Promise<{ status: 'healthy' | 'degraded'; queueSize: number }>;
    restartService(serviceName: string): Promise<boolean>;
    scaleService(serviceName: string, instances: number): Promise<boolean>;
    sendAlert(severity: 'info' | 'warning' | 'critical', message: string): Promise<void>;
    recordMetric(name: string, value: number, tags: Record<string, string>): Promise<void>;
}

const activities = proxyActivities<HealthCheckActivities>({
    startToCloseTimeout: '30s',
    retry: {
        maximumAttempts: 2,
        initialIntervalMs: 1000,
        maximumIntervalMs: 5000,
    },
});

@WorkflowController({ taskQueue: 'health-monitoring' })
export class HealthMonitoringController {
    private overallHealth = 'healthy';
    private consecutiveFailures = 0;
    private lastCheckTime?: Date;
    private alerts: Array<{ time: Date; severity: string; message: string }> = [];
    private autoRemediationEnabled = true;
    
    @Interval('1m', {
        scheduleId: 'health-check',
        description: 'Continuous system health monitoring'
    })
    @WorkflowMethod()
    async monitorSystemHealth(): Promise<void> {
        this.lastCheckTime = new Date();
        
        try {
            // Check all system components
            const [dbHealth, apiHealth, queueHealth] = await Promise.all([
                activities.checkDatabaseHealth(),
                activities.checkApiHealth('/api/health'),
                activities.checkQueueHealth(),
            ]);
            
            // Record metrics
            await activities.recordMetric('database.response_time', dbHealth.responseTime, {
                component: 'database'
            });
            await activities.recordMetric('api.response_time', apiHealth.responseTime, {
                component: 'api'
            });
            await activities.recordMetric('queue.size', queueHealth.queueSize, {
                component: 'queue'
            });
            
            // Determine overall health
            const healthStatuses = [dbHealth.status, apiHealth.status, queueHealth.status];
            
            if (healthStatuses.includes('unhealthy')) {
                this.overallHealth = 'unhealthy';
                this.consecutiveFailures++;
                
                await this.handleUnhealthyState(dbHealth, apiHealth, queueHealth);
                
            } else if (healthStatuses.includes('degraded')) {
                this.overallHealth = 'degraded';
                this.consecutiveFailures++;
                
                await this.handleDegradedState(queueHealth);
                
            } else {
                if (this.overallHealth !== 'healthy') {
                    // System recovered
                    await activities.sendAlert('info', 'System health restored to normal');
                    this.alerts.push({
                        time: new Date(),
                        severity: 'info',
                        message: 'System health restored'
                    });
                }
                
                this.overallHealth = 'healthy';
                this.consecutiveFailures = 0;
            }
            
        } catch (error) {
            this.consecutiveFailures++;
            this.overallHealth = 'unhealthy';
            
            await activities.sendAlert('critical', `Health check failed: ${error.message}`);
            this.alerts.push({
                time: new Date(),
                severity: 'critical',
                message: `Health check failed: ${error.message}`
            });
        }
    }
    
    private async handleUnhealthyState(
        dbHealth: any,
        apiHealth: any,
        queueHealth: any
    ): Promise<void> {
        const alerts = [];
        
        if (dbHealth.status === 'unhealthy') {
            alerts.push('Database is unhealthy');
            
            if (this.autoRemediationEnabled && this.consecutiveFailures >= 3) {
                await activities.restartService('database');
                alerts.push('Attempted database restart');
            }
        }
        
        if (apiHealth.status === 'unhealthy') {
            alerts.push('API is unhealthy');
            
            if (this.autoRemediationEnabled && this.consecutiveFailures >= 2) {
                await activities.scaleService('api', 3); // Scale up
                alerts.push('Scaled up API instances');
            }
        }
        
        for (const alert of alerts) {
            await activities.sendAlert('critical', alert);
            this.alerts.push({
                time: new Date(),
                severity: 'critical',
                message: alert
            });
        }
    }
    
    private async handleDegradedState(queueHealth: any): Promise<void> {
        if (queueHealth.queueSize > 1000) {
            const message = `Queue size is high: ${queueHealth.queueSize}`;
            await activities.sendAlert('warning', message);
            
            this.alerts.push({
                time: new Date(),
                severity: 'warning',
                message
            });
            
            if (this.autoRemediationEnabled && queueHealth.queueSize > 5000) {
                await activities.scaleService('worker', 5); // Scale up workers
            }
        }
    }
    
    @Signal('toggleAutoRemediation')
    async toggleAutoRemediation(): Promise<void> {
        this.autoRemediationEnabled = !this.autoRemediationEnabled;
        
        const message = `Auto-remediation ${this.autoRemediationEnabled ? 'enabled' : 'disabled'}`;
        await activities.sendAlert('info', message);
        
        this.alerts.push({
            time: new Date(),
            severity: 'info',
            message
        });
    }
    
    @Signal('forceHealthCheck')
    async forceHealthCheck(): Promise<void> {
        // Trigger immediate health check
        await this.monitorSystemHealth();
    }
    
    @Query('getHealthStatus')
    getHealthStatus(): {
        overall: string;
        lastCheck: Date | undefined;
        consecutiveFailures: number;
        autoRemediationEnabled: boolean;
    } {
        return {
            overall: this.overallHealth,
            lastCheck: this.lastCheckTime,
            consecutiveFailures: this.consecutiveFailures,
            autoRemediationEnabled: this.autoRemediationEnabled
        };
    }
    
    @Query('getRecentAlerts')
    getRecentAlerts(count = 10): Array<{ time: Date; severity: string; message: string }> {
        return this.alerts.slice(-count);
    }
}
```

These examples demonstrate real-world patterns and use cases for NestJS Temporal Core, showing how to build robust, scalable workflows with proper error handling, compensation, scheduling, and monitoring.

---

**[← API Reference](./api-reference.md)** 