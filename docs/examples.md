# 🍳 Examples & Recipes

Real-world examples and patterns for using NestJS Temporal Core in production applications.

## Table of Contents

- [E-commerce Order Processing](#e-commerce-order-processing)
- [User Onboarding Journey](#user-onboarding-journey)
- [Payment Processing with Saga](#payment-processing-with-saga)
- [Data Pipeline with ETL](#data-pipeline-with-etl)
- [Scheduled Reports & Analytics](#scheduled-reports--analytics)
- [Health Monitoring System](#health-monitoring-system)
- [Multi-Tenant Application](#multi-tenant-application)
- [Testing Strategies](#testing-strategies)

## E-commerce Order Processing

A complete order processing system with inventory management, payment processing, and fulfillment.

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
}

@Injectable()
@Activity()
export class OrderActivities {
    @ActivityMethod()
    async validateOrder(order: Order): Promise<{ valid: boolean; errors: string[] }> {
        console.log(`Validating order ${order.orderId}`);

        const errors: string[] = [];

        if (!order.customerId) {
            errors.push('Customer ID is required');
        }

        if (!order.items || order.items.length === 0) {
            errors.push('Order must have at least one item');
        }

        if (order.totalAmount <= 0) {
            errors.push('Order total must be greater than zero');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    @ActivityMethod()
    async reserveInventory(items: OrderItem[]): Promise<{
        success: boolean;
        reservationId?: string;
        unavailableItems?: OrderItem[];
    }> {
        console.log('Reserving inventory for items:', items);

        // Simulate inventory check
        const unavailableItems: OrderItem[] = [];

        for (const item of items) {
            const available = await this.getAvailableQuantity(item.productId);
            if (available < item.quantity) {
                unavailableItems.push(item);
            }
        }

        if (unavailableItems.length > 0) {
            return {
                success: false,
                unavailableItems,
            };
        }

        // Reserve items
        const reservationId = `res_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // In real app: update inventory system
        console.log(`Reserved inventory with ID: ${reservationId}`);

        return {
            success: true,
            reservationId,
        };
    }

    @ActivityMethod()
    async processPayment(
        orderId: string,
        amount: number,
        paymentMethod: string,
    ): Promise<{
        success: boolean;
        paymentId?: string;
        error?: string;
    }> {
        console.log(`Processing payment for order ${orderId}: $${amount}`);

        // Simulate payment processing
        if (Math.random() < 0.1) {
            // 10% failure rate for demo
            return {
                success: false,
                error: 'Payment declined by bank',
            };
        }

        const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log(`Payment processed successfully: ${paymentId}`);

        return {
            success: true,
            paymentId,
        };
    }

    @ActivityMethod()
    async fulfillOrder(
        orderId: string,
        items: OrderItem[],
    ): Promise<{
        success: boolean;
        trackingNumber?: string;
        error?: string;
    }> {
        console.log(`Fulfilling order ${orderId}`);

        // Simulate fulfillment process
        if (Math.random() < 0.05) {
            // 5% failure rate
            return {
                success: false,
                error: 'Fulfillment center temporarily unavailable',
            };
        }

        const trackingNumber = `track_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        console.log(`Order fulfilled with tracking: ${trackingNumber}`);

        return {
            success: true,
            trackingNumber,
        };
    }

    @ActivityMethod()
    async sendOrderConfirmation(
        orderId: string,
        customerId: string,
        trackingNumber: string,
    ): Promise<void> {
        console.log(`Sending order confirmation to customer ${customerId}`);
        console.log(`Order: ${orderId}, Tracking: ${trackingNumber}`);

        // In real app: send email/SMS notification
    }

    @ActivityMethod()
    async releaseInventory(reservationId: string): Promise<void> {
        console.log(`Releasing inventory reservation: ${reservationId}`);
        // In real app: update inventory system
    }

    @ActivityMethod()
    async refundPayment(paymentId: string, amount: number): Promise<void> {
        console.log(`Refunding payment ${paymentId}: $${amount}`);
        // In real app: process refund via payment gateway
    }

    private async getAvailableQuantity(productId: string): Promise<number> {
        // Simulate inventory lookup
        return Math.floor(Math.random() * 50) + 10;
    }
}
```

### Order Workflow Controller

```typescript
// src/workflows/order.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities, sleep } from '@temporalio/workflow';
import { Order, OrderItem } from '../activities/order.activities';

interface OrderActivities {
    validateOrder(order: Order): Promise<{ valid: boolean; errors: string[] }>;
    reserveInventory(items: OrderItem[]): Promise<{
        success: boolean;
        reservationId?: string;
        unavailableItems?: OrderItem[];
    }>;
    processPayment(
        orderId: string,
        amount: number,
        paymentMethod: string,
    ): Promise<{
        success: boolean;
        paymentId?: string;
        error?: string;
    }>;
    fulfillOrder(
        orderId: string,
        items: OrderItem[],
    ): Promise<{
        success: boolean;
        trackingNumber?: string;
        error?: string;
    }>;
    sendOrderConfirmation(
        orderId: string,
        customerId: string,
        trackingNumber: string,
    ): Promise<void>;
    releaseInventory(reservationId: string): Promise<void>;
    refundPayment(paymentId: string, amount: number): Promise<void>;
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
    private progress = 0;
    private cancelled = false;

    @WorkflowMethod()
    async processOrder(
        order: Order,
        paymentMethod = 'credit_card',
    ): Promise<{
        status: string;
        trackingNumber?: string;
        error?: string;
    }> {
        try {
            // Step 1: Validate order (10%)
            this.status = 'validating';
            this.progress = 10;

            const validation = await activities.validateOrder(order);
            if (!validation.valid) {
                throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
            }

            // Step 2: Reserve inventory (30%)
            this.status = 'reserving_inventory';
            this.progress = 30;

            const reservation = await activities.reserveInventory(order.items);
            if (!reservation.success) {
                throw new Error(
                    `Inventory unavailable for items: ${reservation.unavailableItems?.map((i) => i.productId).join(', ')}`,
                );
            }

            this.reservationId = reservation.reservationId;

            // Step 3: Process payment (60%)
            this.status = 'processing_payment';
            this.progress = 60;

            const payment = await activities.processPayment(
                order.orderId,
                order.totalAmount,
                paymentMethod,
            );
            if (!payment.success) {
                throw new Error(`Payment failed: ${payment.error}`);
            }

            this.paymentId = payment.paymentId;

            // Step 4: Fulfill order (80%)
            this.status = 'fulfilling';
            this.progress = 80;

            const fulfillment = await activities.fulfillOrder(order.orderId, order.items);
            if (!fulfillment.success) {
                throw new Error(`Fulfillment failed: ${fulfillment.error}`);
            }

            this.trackingNumber = fulfillment.trackingNumber;

            // Step 5: Send confirmation (100%)
            this.status = 'confirming';
            this.progress = 90;

            await activities.sendOrderConfirmation(
                order.orderId,
                order.customerId,
                this.trackingNumber!,
            );

            this.status = 'completed';
            this.progress = 100;

            return {
                status: this.status,
                trackingNumber: this.trackingNumber,
            };
        } catch (error) {
            this.error = error.message;
            this.status = 'compensating';

            await this.compensate();

            this.status = 'failed';
            throw error;
        }
    }

    @Signal('cancelOrder')
    async cancelOrder(reason: string): Promise<void> {
        if (this.status === 'completed') {
            throw new Error('Cannot cancel completed order');
        }

        console.log(`Order cancellation requested: ${reason}`);
        this.cancelled = true;
        this.status = 'cancelling';

        await this.compensate();

        this.status = 'cancelled';
        this.error = `Cancelled: ${reason}`;
    }

    @Signal('updateProgress')
    async updateProgress(newProgress: number): Promise<void> {
        if (newProgress >= 0 && newProgress <= 100) {
            this.progress = newProgress;
        }
    }

    private async compensate(): Promise<void> {
        console.log('Starting compensation...');

        // Compensation in reverse order
        try {
            if (this.paymentId) {
                console.log(`Refunding payment: ${this.paymentId}`);
                await activities.refundPayment(this.paymentId, 0); // Amount would be stored
            }

            if (this.reservationId) {
                console.log(`Releasing inventory: ${this.reservationId}`);
                await activities.releaseInventory(this.reservationId);
            }
        } catch (compensationError) {
            console.error('Compensation failed:', compensationError);
            // In production, this might trigger manual intervention
        }
    }

    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }

    @Query('getProgress')
    getProgress(): number {
        return this.progress;
    }

    @Query('getTrackingNumber')
    getTrackingNumber(): string | undefined {
        return this.trackingNumber;
    }

    @Query('getError')
    getError(): string | undefined {
        return this.error;
    }

    @Query('isCancelled')
    isCancelled(): boolean {
        return this.cancelled;
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
    constructor(private readonly temporal: TemporalService) {}

    async createOrder(
        order: Order,
        paymentMethod = 'credit_card',
    ): Promise<{
        workflowId: string;
        status: string;
    }> {
        const workflowId = `order-${order.orderId}`;

        try {
            const { result } = await this.temporal.startWorkflow(
                'processOrder',
                [order, paymentMethod],
                {
                    taskQueue: 'orders',
                    workflowId,
                    searchAttributes: {
                        'customer-id': order.customerId,
                        'order-amount': order.totalAmount,
                        'order-status': 'pending',
                    },
                },
            );

            // Don't wait for completion, return immediately
            return {
                workflowId,
                status: 'processing',
            };
        } catch (error) {
            console.error(`Failed to start order workflow: ${error.message}`);
            throw new Error(`Order processing failed: ${error.message}`);
        }
    }

    async cancelOrder(orderId: string, reason: string): Promise<void> {
        const workflowId = `order-${orderId}`;

        try {
            await this.temporal.signalWorkflow(workflowId, 'cancelOrder', [reason]);
        } catch (error) {
            throw new Error(`Failed to cancel order: ${error.message}`);
        }
    }

    async getOrderStatus(orderId: string): Promise<{
        status: string;
        progress: number;
        trackingNumber?: string;
        error?: string;
        cancelled: boolean;
    }> {
        const workflowId = `order-${orderId}`;

        try {
            const [status, progress, trackingNumber, error, cancelled] = await Promise.all([
                this.temporal.queryWorkflow<string>(workflowId, 'getStatus'),
                this.temporal.queryWorkflow<number>(workflowId, 'getProgress'),
                this.temporal.queryWorkflow<string | undefined>(workflowId, 'getTrackingNumber'),
                this.temporal.queryWorkflow<string | undefined>(workflowId, 'getError'),
                this.temporal.queryWorkflow<boolean>(workflowId, 'isCancelled'),
            ]);

            return {
                status,
                progress,
                trackingNumber,
                error,
                cancelled,
            };
        } catch (error) {
            throw new Error(`Failed to get order status: ${error.message}`);
        }
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

@Injectable()
@Activity()
export class OnboardingActivities {
    @ActivityMethod()
    async sendWelcomeEmail(user: User): Promise<boolean> {
        console.log(`Sending welcome email to ${user.email}`);

        // Simulate email sending
        const success = Math.random() > 0.05; // 95% success rate

        if (success) {
            console.log(`Welcome email sent successfully to ${user.email}`);
        } else {
            throw new Error('Failed to send welcome email');
        }

        return success;
    }

    @ActivityMethod()
    async sendVerificationEmail(user: User): Promise<string> {
        console.log(`Sending verification email to ${user.email}`);

        const verificationToken = `verify_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // In real app: store token and send email with verification link
        console.log(`Verification token generated: ${verificationToken}`);

        return verificationToken;
    }

    @ActivityMethod()
    async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
        console.log(`Sending SMS to ${phoneNumber}: ${message}`);

        // Simulate SMS sending
        const success = Math.random() > 0.1; // 90% success rate

        if (!success) {
            throw new Error('Failed to send SMS');
        }

        return success;
    }

    @ActivityMethod()
    async createUserProfile(user: User): Promise<string> {
        console.log(`Creating user profile for ${user.userId}`);

        // Simulate profile creation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const profileId = `profile_${user.userId}_${Date.now()}`;
        console.log(`User profile created: ${profileId}`);

        return profileId;
    }

    @ActivityMethod()
    async assignUserToSegment(userId: string, userData: any): Promise<string> {
        console.log(`Analyzing user ${userId} for segmentation`);

        // Simulate user segmentation based on data
        const segments = ['starter', 'professional', 'enterprise'];
        const segment = segments[Math.floor(Math.random() * segments.length)];

        console.log(`User ${userId} assigned to segment: ${segment}`);

        return segment;
    }

    @ActivityMethod()
    async sendPersonalizedContent(userId: string, segment: string): Promise<void> {
        console.log(`Sending personalized content to user ${userId} (segment: ${segment})`);

        // In real app: send personalized onboarding content
        const contentMap = {
            starter: 'Getting Started Guide',
            professional: 'Advanced Features Guide',
            enterprise: 'Enterprise Setup Guide',
        };

        const content = contentMap[segment] || 'Default Guide';
        console.log(`Sent content: ${content}`);
    }

    @ActivityMethod()
    async trackOnboardingEvent(userId: string, event: string, properties: any): Promise<void> {
        console.log(`Tracking event: ${event} for user ${userId}`, properties);

        // In real app: send to analytics service
    }

    @ActivityMethod()
    async sendOnboardingReminder(user: User, step: string): Promise<void> {
        console.log(`Sending onboarding reminder to ${user.email} for step: ${step}`);

        // In real app: send reminder email
    }

    @ActivityMethod()
    async scheduleFollowUp(userId: string, delayDays: number): Promise<string> {
        console.log(`Scheduling follow-up for user ${userId} in ${delayDays} days`);

        const followUpId = `followup_${userId}_${Date.now()}`;

        // In real app: schedule follow-up workflow or reminder

        return followUpId;
    }
}
```

### Onboarding Workflow Controller

```typescript
// src/workflows/onboarding.controller.ts
import { WorkflowController, WorkflowMethod, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities, sleep, condition, defineSignal, setHandler } from '@temporalio/workflow';
import { User } from '../activities/onboarding.activities';

interface OnboardingActivities {
    sendWelcomeEmail(user: User): Promise<boolean>;
    sendVerificationEmail(user: User): Promise<string>;
    sendSMS(phoneNumber: string, message: string): Promise<boolean>;
    createUserProfile(user: User): Promise<string>;
    assignUserToSegment(userId: string, userData: any): Promise<string>;
    sendPersonalizedContent(userId: string, segment: string): Promise<void>;
    trackOnboardingEvent(userId: string, event: string, properties: any): Promise<void>;
    sendOnboardingReminder(user: User, step: string): Promise<void>;
    scheduleFollowUp(userId: string, delayDays: number): Promise<string>;
}

const activities = proxyActivities<OnboardingActivities>({
    startToCloseTimeout: '5m',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 1000,
        maximumIntervalMs: 10000,
    },
});

// Define signals
const emailVerifiedSignal = defineSignal<[]>('emailVerified');
const phoneVerifiedSignal = defineSignal<[]>('phoneVerified');
const profileCompletedSignal = defineSignal<[any]>('profileCompleted');

@WorkflowController({ taskQueue: 'onboarding' })
export class OnboardingController {
    private status = 'started';
    private emailVerified = false;
    private phoneVerified = false;
    private profileCompleted = false;
    private profileData: any = null;
    private segment?: string;
    private step = 0;
    private totalSteps = 4;

    @WorkflowMethod()
    async onboardUser(user: User): Promise<{
        completed: boolean;
        segment?: string;
        finalStatus: string;
    }> {
        try {
            // Set up signal handlers
            setHandler(emailVerifiedSignal, () => {
                this.emailVerified = true;
            });

            setHandler(phoneVerifiedSignal, () => {
                this.phoneVerified = true;
            });

            setHandler(profileCompletedSignal, (data: any) => {
                this.profileCompleted = true;
                this.profileData = data;
            });

            // Step 1: Welcome phase
            this.status = 'welcome';
            this.step = 1;

            await activities.sendWelcomeEmail(user);
            await activities.trackOnboardingEvent(user.userId, 'welcome_sent', {});

            // Step 2: Email verification
            this.status = 'email_verification';
            this.step = 2;

            const verificationToken = await activities.sendVerificationEmail(user);
            await activities.trackOnboardingEvent(user.userId, 'verification_sent', {
                token: verificationToken,
            });

            // Wait for email verification with timeout
            const emailVerified = await condition(() => this.emailVerified, '24h');

            if (!emailVerified) {
                // Send reminder
                await activities.sendOnboardingReminder(user, 'email_verification');

                // Wait another 24 hours
                const secondChance = await condition(() => this.emailVerified, '24h');

                if (!secondChance) {
                    this.status = 'abandoned';
                    await activities.trackOnboardingEvent(user.userId, 'onboarding_abandoned', {
                        step: 'email_verification',
                    });

                    // Schedule follow-up
                    await activities.scheduleFollowUp(user.userId, 7);

                    return {
                        completed: false,
                        finalStatus: 'abandoned_email_verification',
                    };
                }
            }

            await activities.trackOnboardingEvent(user.userId, 'email_verified', {});

            // Step 3: Profile creation
            this.status = 'profile_creation';
            this.step = 3;

            const profileId = await activities.createUserProfile(user);

            // Optional: SMS verification if phone number provided
            if (user.phoneNumber) {
                await activities.sendSMS(
                    user.phoneNumber,
                    'Welcome! Please verify your phone number.',
                );

                // Wait for phone verification (optional, with shorter timeout)
                await condition(() => this.phoneVerified, '30m');

                if (this.phoneVerified) {
                    await activities.trackOnboardingEvent(user.userId, 'phone_verified', {});
                }
            }

            // Wait for profile completion (or timeout)
            const profileCompleted = await condition(() => this.profileCompleted, '7d');

            if (!profileCompleted) {
                // Send reminder after 3 days
                await sleep('3d');
                if (!this.profileCompleted) {
                    await activities.sendOnboardingReminder(user, 'profile_completion');
                }

                // Final check
                await condition(() => this.profileCompleted, '4d');
            }

            // Step 4: Personalization
            this.status = 'personalizing';
            this.step = 4;

            this.segment = await activities.assignUserToSegment(
                user.userId,
                this.profileData || {},
            );
            await activities.sendPersonalizedContent(user.userId, this.segment);

            this.status = 'completed';

            await activities.trackOnboardingEvent(user.userId, 'onboarding_completed', {
                segment: this.segment,
                emailVerified: this.emailVerified,
                phoneVerified: this.phoneVerified,
                profileCompleted: this.profileCompleted,
            });

            return {
                completed: true,
                segment: this.segment,
                finalStatus: 'completed',
            };
        } catch (error) {
            this.status = 'failed';
            await activities.trackOnboardingEvent(user.userId, 'onboarding_failed', {
                error: error.message,
                step: this.step,
            });

            throw error;
        }
    }

    @Signal('emailVerified')
    async confirmEmailVerification(): Promise<void> {
        this.emailVerified = true;
    }

    @Signal('phoneVerified')
    async confirmPhoneVerification(): Promise<void> {
        this.phoneVerified = true;
    }

    @Signal('profileCompleted')
    async confirmProfileCompletion(profileData: any): Promise<void> {
        this.profileCompleted = true;
        this.profileData = profileData;
    }

    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }

    @Query('getProgress')
    getProgress(): {
        step: number;
        totalSteps: number;
        percentage: number;
        emailVerified: boolean;
        phoneVerified: boolean;
        profileCompleted: boolean;
    } {
        return {
            step: this.step,
            totalSteps: this.totalSteps,
            percentage: Math.round((this.step / this.totalSteps) * 100),
            emailVerified: this.emailVerified,
            phoneVerified: this.phoneVerified,
            profileCompleted: this.profileCompleted,
        };
    }

    @Query('getSegment')
    getSegment(): string | undefined {
        return this.segment;
    }
}
```

## Payment Processing with Saga

Distributed transaction management with compensation patterns.

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
    merchantId: string;
    paymentMethod: string;
}

@Injectable()
@Activity()
export class PaymentActivities {
    @ActivityMethod()
    async validatePaymentRequest(request: PaymentRequest): Promise<{
        valid: boolean;
        errors: string[];
    }> {
        console.log(`Validating payment request ${request.paymentId}`);

        const errors: string[] = [];

        if (request.amount <= 0) {
            errors.push('Amount must be greater than zero');
        }

        if (!request.customerId) {
            errors.push('Customer ID is required');
        }

        if (!request.paymentMethod) {
            errors.push('Payment method is required');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    @ActivityMethod()
    async authorizePayment(request: PaymentRequest): Promise<{
        success: boolean;
        authorizationId?: string;
        error?: string;
    }> {
        console.log(`Authorizing payment ${request.paymentId} for $${request.amount}`);

        // Simulate payment authorization
        if (Math.random() < 0.1) {
            // 10% failure rate
            return {
                success: false,
                error: 'Payment authorization declined',
            };
        }

        const authorizationId = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return {
            success: true,
            authorizationId,
        };
    }

    @ActivityMethod()
    async capturePayment(
        authorizationId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }> {
        console.log(`Capturing payment ${authorizationId} for $${amount}`);

        // Simulate payment capture
        if (Math.random() < 0.05) {
            // 5% failure rate
            return {
                success: false,
                error: 'Payment capture failed',
            };
        }

        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return {
            success: true,
            transactionId,
        };
    }

    @ActivityMethod()
    async updateMerchantBalance(
        merchantId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }> {
        console.log(`Updating merchant ${merchantId} balance by $${amount}`);

        // Simulate balance update
        if (Math.random() < 0.03) {
            // 3% failure rate
            return {
                success: false,
                error: 'Merchant balance update failed',
            };
        }

        const newBalance = Math.random() * 10000 + amount; // Simulate new balance

        return {
            success: true,
            newBalance,
        };
    }

    @ActivityMethod()
    async updateCustomerBalance(
        customerId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }> {
        console.log(`Updating customer ${customerId} balance by $${amount}`);

        // Simulate balance update
        if (Math.random() < 0.03) {
            // 3% failure rate
            return {
                success: false,
                error: 'Customer balance update failed',
            };
        }

        const newBalance = Math.random() * 1000 - amount; // Simulate new balance

        return {
            success: true,
            newBalance,
        };
    }

    @ActivityMethod()
    async sendPaymentNotification(
        customerId: string,
        paymentId: string,
        status: string,
    ): Promise<void> {
        console.log(`Sending payment notification to customer ${customerId}: ${status}`);

        // In real app: send email/SMS notification
    }

    // Compensation activities
    @ActivityMethod()
    async voidAuthorization(authorizationId: string): Promise<void> {
        console.log(`Voiding authorization: ${authorizationId}`);
        // Reverse the authorization
    }

    @ActivityMethod()
    async refundPayment(transactionId: string, amount: number): Promise<string> {
        console.log(`Refunding payment ${transactionId} for $${amount}`);

        const refundId = `refund_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        return refundId;
    }

    @ActivityMethod()
    async compensateMerchantBalance(merchantId: string, amount: number): Promise<void> {
        console.log(`Compensating merchant ${merchantId} balance by $${amount}`);
        // Reverse the merchant balance update
    }

    @ActivityMethod()
    async compensateCustomerBalance(customerId: string, amount: number): Promise<void> {
        console.log(`Compensating customer ${customerId} balance by $${amount}`);
        // Reverse the customer balance update
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
    validatePaymentRequest(request: PaymentRequest): Promise<{ valid: boolean; errors: string[] }>;
    authorizePayment(request: PaymentRequest): Promise<{
        success: boolean;
        authorizationId?: string;
        error?: string;
    }>;
    capturePayment(
        authorizationId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    updateMerchantBalance(
        merchantId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }>;
    updateCustomerBalance(
        customerId: string,
        amount: number,
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }>;
    sendPaymentNotification(customerId: string, paymentId: string, status: string): Promise<void>;

    // Compensation activities
    voidAuthorization(authorizationId: string): Promise<void>;
    refundPayment(transactionId: string, amount: number): Promise<string>;
    compensateMerchantBalance(merchantId: string, amount: number): Promise<void>;
    compensateCustomerBalance(customerId: string, amount: number): Promise<void>;
}

const activities = proxyActivities<PaymentActivities>({
    startToCloseTimeout: '2m',
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 500,
        maximumIntervalMs: 5000,
    },
});

@WorkflowController({ taskQueue: 'payments' })
export class PaymentWorkflowController {
    private status = 'pending';
    private authorizationId?: string;
    private transactionId?: string;
    private merchantBalanceUpdated = false;
    private customerBalanceUpdated = false;
    private error?: string;
    private compensationStatus: string[] = [];

    @WorkflowMethod()
    async processPayment(request: PaymentRequest): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }> {
        try {
            // Step 1: Validate payment request
            this.status = 'validating';

            const validation = await activities.validatePaymentRequest(request);
            if (!validation.valid) {
                throw new Error(`Payment validation failed: ${validation.errors.join(', ')}`);
            }

            // Step 2: Authorize payment
            this.status = 'authorizing';

            const authorization = await activities.authorizePayment(request);
            if (!authorization.success) {
                throw new Error(`Payment authorization failed: ${authorization.error}`);
            }

            this.authorizationId = authorization.authorizationId;

            // Step 3: Capture payment
            this.status = 'capturing';

            const capture = await activities.capturePayment(this.authorizationId!, request.amount);
            if (!capture.success) {
                throw new Error(`Payment capture failed: ${capture.error}`);
            }

            this.transactionId = capture.transactionId;

            // Step 4: Update merchant balance
            this.status = 'updating_merchant_balance';

            const merchantUpdate = await activities.updateMerchantBalance(
                request.merchantId,
                request.amount,
            );
            if (!merchantUpdate.success) {
                throw new Error(`Merchant balance update failed: ${merchantUpdate.error}`);
            }

            this.merchantBalanceUpdated = true;

            // Step 5: Update customer balance (if applicable)
            this.status = 'updating_customer_balance';

            const customerUpdate = await activities.updateCustomerBalance(
                request.customerId,
                -request.amount,
            );
            if (!customerUpdate.success) {
                throw new Error(`Customer balance update failed: ${customerUpdate.error}`);
            }

            this.customerBalanceUpdated = true;

            // Step 6: Send notification
            this.status = 'notifying';

            await activities.sendPaymentNotification(
                request.customerId,
                request.paymentId,
                'completed',
            );

            this.status = 'completed';

            return {
                success: true,
                transactionId: this.transactionId,
            };
        } catch (error) {
            this.error = error.message;
            this.status = 'compensating';

            await this.runCompensation(request);

            this.status = 'failed';

            // Send failure notification
            await activities.sendPaymentNotification(
                request.customerId,
                request.paymentId,
                'failed',
            );

            return {
                success: false,
                error: this.error,
            };
        }
    }

    @Signal('cancelPayment')
    async cancelPayment(request: PaymentRequest): Promise<void> {
        if (this.status === 'completed') {
            // If already completed, process refund
            this.status = 'refunding';

            if (this.transactionId) {
                await activities.refundPayment(this.transactionId, request.amount);
            }

            this.status = 'refunded';
        } else {
            // If in progress, cancel and compensate
            this.status = 'cancelling';
            await this.runCompensation(request);
            this.status = 'cancelled';
        }
    }

    private async runCompensation(request: PaymentRequest): Promise<void> {
        console.log('Starting compensation process...');

        try {
            // Compensate in reverse order (Saga pattern)

            // 1. Compensate customer balance if updated
            if (this.customerBalanceUpdated) {
                await activities.compensateCustomerBalance(request.customerId, -request.amount);
                this.compensationStatus.push('customer_balance_compensated');
            }

            // 2. Compensate merchant balance if updated
            if (this.merchantBalanceUpdated) {
                await activities.compensateMerchantBalance(request.merchantId, request.amount);
                this.compensationStatus.push('merchant_balance_compensated');
            }

            // 3. Refund captured payment
            if (this.transactionId) {
                await activities.refundPayment(this.transactionId, request.amount);
                this.compensationStatus.push('payment_refunded');
            }

            // 4. Void authorization if only authorized
            if (this.authorizationId && !this.transactionId) {
                await activities.voidAuthorization(this.authorizationId);
                this.compensationStatus.push('authorization_voided');
            }

            console.log('Compensation completed successfully');
        } catch (compensationError) {
            console.error('Compensation failed:', compensationError);
            this.compensationStatus.push('compensation_failed');

            // In production, this might trigger manual intervention
            // or escalate to a dead letter queue
        }
    }

    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }

    @Query('getTransactionId')
    getTransactionId(): string | undefined {
        return this.transactionId;
    }

    @Query('getError')
    getError(): string | undefined {
        return this.error;
    }

    @Query('getCompensationStatus')
    getCompensationStatus(): string[] {
        return this.compensationStatus;
    }
}
```

## Data Pipeline with ETL

Long-running data processing workflows with progress tracking.

### Data Pipeline Activities

```typescript
// src/activities/data-pipeline.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface DataSource {
    type: 'csv' | 'json' | 'database' | 'api';
    location: string;
    credentials?: any;
    batchSize?: number;
}

export interface TransformationConfig {
    rules: TransformationRule[];
    outputFormat: 'json' | 'csv' | 'parquet';
    validation?: ValidationRule[];
}

export interface TransformationRule {
    field: string;
    operation: 'map' | 'filter' | 'aggregate' | 'join';
    parameters: any;
}

export interface ValidationRule {
    field: string;
    type: 'required' | 'numeric' | 'email' | 'date';
    parameters?: any;
}

@Injectable()
@Activity()
export class DataPipelineActivities {
    @ActivityMethod()
    async extractData(source: DataSource): Promise<{
        data: any[];
        recordCount: number;
        extractionId: string;
    }> {
        console.log(`Extracting data from ${source.type}: ${source.location}`);

        // Simulate data extraction with batch processing
        const batchSize = source.batchSize || 1000;
        const totalRecords = Math.floor(Math.random() * 50000) + 10000;
        const batches = Math.ceil(totalRecords / batchSize);

        console.log(`Processing ${totalRecords} records in ${batches} batches`);

        const data = this.generateSampleData(totalRecords);
        const extractionId = `extract_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        // Simulate extraction time
        await new Promise((resolve) => setTimeout(resolve, 2000));

        return {
            data,
            recordCount: totalRecords,
            extractionId,
        };
    }

    @ActivityMethod()
    async validateData(
        data: any[],
        validationRules: ValidationRule[],
    ): Promise<{
        valid: boolean;
        validRecords: any[];
        invalidRecords: any[];
        errors: string[];
    }> {
        console.log(`Validating ${data.length} records with ${validationRules.length} rules`);

        const validRecords: any[] = [];
        const invalidRecords: any[] = [];
        const errors: string[] = [];

        for (let i = 0; i < data.length; i++) {
            const record = data[i];
            let isValid = true;

            for (const rule of validationRules) {
                if (!this.validateField(record, rule)) {
                    isValid = false;
                    errors.push(`Record ${i}: ${rule.field} validation failed (${rule.type})`);
                    break;
                }
            }

            if (isValid) {
                validRecords.push(record);
            } else {
                invalidRecords.push(record);
            }
        }

        console.log(
            `Validation complete: ${validRecords.length} valid, ${invalidRecords.length} invalid`,
        );

        return {
            valid: invalidRecords.length === 0,
            validRecords,
            invalidRecords,
            errors,
        };
    }

    @ActivityMethod()
    async transformData(
        data: any[],
        config: TransformationConfig,
    ): Promise<{
        transformedData: any[];
        transformationId: string;
    }> {
        console.log(`Transforming ${data.length} records with ${config.rules.length} rules`);

        let transformedData = [...data];

        // Apply transformation rules sequentially
        for (const rule of config.rules) {
            transformedData = this.applyTransformationRule(transformedData, rule);
            console.log(
                `Applied rule ${rule.operation} on ${rule.field}: ${transformedData.length} records`,
            );
        }

        const transformationId = `transform_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        return {
            transformedData,
            transformationId,
        };
    }

    @ActivityMethod()
    async loadData(
        data: any[],
        destination: string,
        format: string,
    ): Promise<{
        success: boolean;
        loadedCount: number;
        destination: string;
        loadId: string;
    }> {
        console.log(`Loading ${data.length} records to ${destination} in ${format} format`);

        // Simulate data loading with potential failures
        const failureRate = 0.02; // 2% failure rate

        if (Math.random() < failureRate) {
            throw new Error('Data loading failed due to destination unavailable');
        }

        // Simulate loading time based on data size
        const loadTime = Math.min((data.length / 1000) * 1000, 10000); // Max 10 seconds
        await new Promise((resolve) => setTimeout(resolve, loadTime));

        const loadId = `load_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        console.log(`Successfully loaded ${data.length} records with ID: ${loadId}`);

        return {
            success: true,
            loadedCount: data.length,
            destination,
            loadId,
        };
    }

    @ActivityMethod()
    async createDataQualityReport(
        data: any[],
        validationErrors: string[],
    ): Promise<{
        totalRecords: number;
        validRecords: number;
        invalidRecords: number;
        errorRate: number;
        qualityScore: number;
        topErrors: { error: string; count: number }[];
    }> {
        console.log(`Creating data quality report for ${data.length} records`);

        const invalidRecords = validationErrors.length;
        const validRecords = data.length - invalidRecords;
        const errorRate = data.length > 0 ? (invalidRecords / data.length) * 100 : 0;
        const qualityScore = Math.max(0, 100 - errorRate);

        // Group errors by type
        const errorCounts = new Map<string, number>();
        validationErrors.forEach((error) => {
            const errorType = error.split(':')[1]?.trim() || error;
            errorCounts.set(errorType, (errorCounts.get(errorType) || 0) + 1);
        });

        const topErrors = Array.from(errorCounts.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            totalRecords: data.length,
            validRecords,
            invalidRecords,
            errorRate,
            qualityScore,
            topErrors,
        };
    }

    @ActivityMethod()
    async sendPipelineNotification(status: string, details: any): Promise<void> {
        console.log(`Sending pipeline notification: ${status}`, details);

        // In real app: send to Slack, email, monitoring system
    }

    @ActivityMethod()
    async cleanupResources(resourceIds: string[]): Promise<void> {
        console.log(`Cleaning up resources: ${resourceIds.join(', ')}`);

        // Clean up temporary files, connections, etc.
    }

    private generateSampleData(count: number): any[] {
        const data = [];
        const categories = ['A', 'B', 'C', 'D'];

        for (let i = 0; i < count; i++) {
            data.push({
                id: i + 1,
                name: `Record ${i + 1}`,
                value: Math.random() * 1000,
                category: categories[Math.floor(Math.random() * categories.length)],
                timestamp: new Date(Date.now() - Math.random() * 86400000), // Random within last day
                email: `user${i}@example.com`,
                active: Math.random() > 0.1, // 90% active
            });
        }

        return data;
    }

    private validateField(record: any, rule: ValidationRule): boolean {
        const value = record[rule.field];

        switch (rule.type) {
            case 'required':
                return value != null && value !== '';
            case 'numeric':
                return !isNaN(parseFloat(value)) && isFinite(value);
            case 'email':
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            case 'date':
                return !isNaN(Date.parse(value));
            default:
                return true;
        }
    }

    private applyTransformationRule(data: any[], rule: TransformationRule): any[] {
        switch (rule.operation) {
            case 'filter':
                return data.filter((record) => {
                    const value = record[rule.field];
                    return this.evaluateFilterCondition(value, rule.parameters);
                });

            case 'map':
                return data.map((record) => ({
                    ...record,
                    [rule.field]: this.applyMapping(record[rule.field], rule.parameters),
                }));

            case 'aggregate':
                return this.aggregateData(data, rule);

            default:
                return data;
        }
    }

    private evaluateFilterCondition(value: any, condition: any): boolean {
        if (condition.gt !== undefined) return value > condition.gt;
        if (condition.lt !== undefined) return value < condition.lt;
        if (condition.eq !== undefined) return value === condition.eq;
        if (condition.contains !== undefined) return String(value).includes(condition.contains);
        return true;
    }

    private applyMapping(value: any, mapping: any): any {
        if (mapping.multiply !== undefined) return value * mapping.multiply;
        if (mapping.add !== undefined) return value + mapping.add;
        if (mapping.format === 'uppercase') return String(value).toUpperCase();
        if (mapping.format === 'lowercase') return String(value).toLowerCase();
        return value;
    }

    private aggregateData(data: any[], rule: TransformationRule): any[] {
        // Simple aggregation example
        if (rule.parameters.groupBy) {
            const groups = new Map();

            data.forEach((record) => {
                const key = record[rule.parameters.groupBy];
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(record);
            });

            return Array.from(groups.entries()).map(([key, records]) => ({
                [rule.parameters.groupBy]: key,
                count: records.length,
                totalValue: records.reduce((sum, r) => sum + (r[rule.field] || 0), 0),
            }));
        }

        return data;
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
    extractData(source: DataSource): Promise<{
        data: any[];
        recordCount: number;
        extractionId: string;
    }>;
    validateData(
        data: any[],
        validationRules: any[],
    ): Promise<{
        valid: boolean;
        validRecords: any[];
        invalidRecords: any[];
        errors: string[];
    }>;
    transformData(
        data: any[],
        config: TransformationConfig,
    ): Promise<{
        transformedData: any[];
        transformationId: string;
    }>;
    loadData(
        data: any[],
        destination: string,
        format: string,
    ): Promise<{
        success: boolean;
        loadedCount: number;
        destination: string;
        loadId: string;
    }>;
    createDataQualityReport(data: any[], validationErrors: string[]): Promise<any>;
    sendPipelineNotification(status: string, details: any): Promise<void>;
    cleanupResources(resourceIds: string[]): Promise<void>;
}

const activities = proxyActivities<DataPipelineActivities>({
    startToCloseTimeout: '30m', // Data operations can take longer
    retry: {
        maximumAttempts: 3,
        initialIntervalMs: 5000,
        maximumIntervalMs: 60000,
    },
});

@WorkflowController({ taskQueue: 'data-pipeline' })
export class DataPipelineController {
    private status = 'pending';
    private progress = 0;
    private extractedCount = 0;
    private validCount = 0;
    private transformedCount = 0;
    private loadedCount = 0;
    private qualityReport: any = null;
    private errors: string[] = [];
    private resourceIds: string[] = [];
    private paused = false;

    @WorkflowMethod()
    async runPipeline(
        source: DataSource,
        transformConfig: TransformationConfig,
        destination: string,
        validationRules: any[] = [],
    ): Promise<{
        success: boolean;
        processedRecords: number;
        qualityReport: any;
        errors: string[];
    }> {
        try {
            // Step 1: Extract data (20%)
            this.status = 'extracting';
            this.progress = 0;

            const extraction = await activities.extractData(source);
            this.extractedCount = extraction.recordCount;
            this.resourceIds.push(extraction.extractionId);
            this.progress = 20;

            await activities.sendPipelineNotification('extraction_complete', {
                recordCount: this.extractedCount,
                extractionId: extraction.extractionId,
            });

            // Step 2: Validate data (40%)
            this.status = 'validating';

            const validation = await activities.validateData(extraction.data, validationRules);
            this.validCount = validation.validRecords.length;
            this.errors = validation.errors;
            this.progress = 40;

            if (validation.invalidRecords.length > 0) {
                await activities.sendPipelineNotification('validation_warnings', {
                    invalidCount: validation.invalidRecords.length,
                    validCount: validation.validRecords.length,
                    errorSample: validation.errors.slice(0, 5),
                });
            }

            // Proceed with valid records only
            const dataToProcess = validation.validRecords;

            // Step 3: Transform data (70%)
            this.status = 'transforming';

            const transformation = await activities.transformData(dataToProcess, transformConfig);
            this.transformedCount = transformation.transformedData.length;
            this.resourceIds.push(transformation.transformationId);
            this.progress = 70;

            // Step 4: Load data (90%)
            this.status = 'loading';

            const load = await activities.loadData(
                transformation.transformedData,
                destination,
                transformConfig.outputFormat,
            );

            this.loadedCount = load.loadedCount;
            this.resourceIds.push(load.loadId);
            this.progress = 90;

            // Step 5: Generate quality report (100%)
            this.status = 'reporting';

            this.qualityReport = await activities.createDataQualityReport(
                extraction.data,
                validation.errors,
            );
            this.progress = 100;

            this.status = 'completed';

            await activities.sendPipelineNotification('pipeline_complete', {
                extractedCount: this.extractedCount,
                transformedCount: this.transformedCount,
                loadedCount: this.loadedCount,
                qualityReport: this.qualityReport,
            });

            // Cleanup resources
            await activities.cleanupResources(this.resourceIds);

            return {
                success: true,
                processedRecords: this.loadedCount,
                qualityReport: this.qualityReport,
                errors: this.errors,
            };
        } catch (error) {
            this.status = 'failed';
            this.errors.push(error.message);

            await activities.sendPipelineNotification('pipeline_failed', {
                error: error.message,
                extractedCount: this.extractedCount,
                transformedCount: this.transformedCount,
                loadedCount: this.loadedCount,
            });

            // Cleanup resources on failure
            if (this.resourceIds.length > 0) {
                await activities.cleanupResources(this.resourceIds);
            }

            throw error;
        }
    }

    @Cron('0 2 * * *', {
        scheduleId: 'daily-data-pipeline',
        description: 'Daily data processing pipeline',
        timezone: 'UTC',
    })
    @WorkflowMethod()
    async runDailyPipeline(): Promise<void> {
        const source: DataSource = {
            type: 'database',
            location: 'daily_transactions',
            batchSize: 5000,
        };

        const transformConfig: TransformationConfig = {
            rules: [
                {
                    field: 'amount',
                    operation: 'filter',
                    parameters: { gt: 0 }, // Remove zero amounts
                },
                {
                    field: 'amount',
                    operation: 'map',
                    parameters: { multiply: 1.02 }, // Apply 2% fee
                },
                {
                    field: 'category',
                    operation: 'map',
                    parameters: { format: 'uppercase' },
                },
            ],
            outputFormat: 'parquet',
        };

        const validationRules = [
            { field: 'id', type: 'required' },
            { field: 'amount', type: 'numeric' },
            { field: 'email', type: 'email' },
            { field: 'timestamp', type: 'date' },
        ];

        await this.runPipeline(
            source,
            transformConfig,
            'processed_daily_transactions',
            validationRules,
        );
    }

    @Signal('pausePipeline')
    async pausePipeline(): Promise<void> {
        if (this.status === 'completed' || this.status === 'failed') {
            throw new Error('Cannot pause completed or failed pipeline');
        }

        this.paused = true;
        this.status = 'paused';

        await activities.sendPipelineNotification('pipeline_paused', {
            pausedAt: new Date(),
            progress: this.progress,
        });
    }

    @Signal('resumePipeline')
    async resumePipeline(): Promise<void> {
        if (!this.paused) {
            throw new Error('Pipeline is not paused');
        }

        this.paused = false;
        this.status = 'resuming';

        await activities.sendPipelineNotification('pipeline_resumed', {
            resumedAt: new Date(),
            progress: this.progress,
        });
    }

    @Query('getStatus')
    getStatus(): string {
        return this.status;
    }

    @Query('getProgress')
    getProgress(): {
        percentage: number;
        extractedCount: number;
        validCount: number;
        transformedCount: number;
        loadedCount: number;
        currentStep: string;
    } {
        return {
            percentage: this.progress,
            extractedCount: this.extractedCount,
            validCount: this.validCount,
            transformedCount: this.transformedCount,
            loadedCount: this.loadedCount,
            currentStep: this.status,
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

    @Query('isPaused')
    isPaused(): boolean {
        return this.paused;
    }
}
```

## Scheduled Reports & Analytics

Automated report generation with multiple output formats and distribution.

### Reports Workflow Controller

```typescript
// src/workflows/reports.controller.ts
import { WorkflowController, WorkflowMethod, Cron, Query, Signal } from 'nestjs-temporal-core';
import { proxyActivities } from '@temporalio/workflow';
import { CRON_EXPRESSIONS } from 'nestjs-temporal-core';

interface ReportActivities {
    generateSalesReport(
        period: string,
        filters?: any,
    ): Promise<{
        reportId: string;
        recordCount: number;
        revenue: number;
    }>;
    generateUserAnalytics(period: string): Promise<{
        reportId: string;
        userCount: number;
        activeUsers: number;
    }>;
    generateFinancialReport(period: string): Promise<{
        reportId: string;
        revenue: number;
        expenses: number;
        profit: number;
    }>;
    exportToCSV(reportId: string): Promise<string>;
    exportToPDF(reportId: string): Promise<string>;
    exportToExcel(reportId: string): Promise<string>;
    uploadToS3(filePath: string, bucket: string, key: string): Promise<string>;
    sendReportEmail(recipients: string[], reportUrls: string[], reportType: string): Promise<void>;
    postToSlack(channel: string, message: string, attachments?: any[]): Promise<void>;
    archiveOldReports(retentionDays: number): Promise<number>;
    createReportDashboard(reports: any[]): Promise<string>;
}

const activities = proxyActivities<ReportActivities>({
    startToCloseTimeout: '20m', // Reports can take time
    retry: {
        maximumAttempts: 2,
        initialIntervalMs: 10000,
        maximumIntervalMs: 60000,
    },
});

@WorkflowController({ taskQueue: 'reports' })
export class ReportsController {
    private lastReportGenerated?: string;
    private totalReportsGenerated = 0;
    private lastError?: string;
    private reportsEnabled = true;

    @Cron(CRON_EXPRESSIONS.DAILY_8AM, {
        scheduleId: 'daily-sales-report',
        description: 'Generate daily sales report',
        timezone: 'America/New_York',
    })
    @WorkflowMethod()
    async generateDailySalesReport(): Promise<void> {
        if (!this.reportsEnabled) {
            console.log('Reports are disabled, skipping daily sales report');
            return;
        }

        try {
            // Generate sales report
            const salesReport = await activities.generateSalesReport('daily', {
                includeDetails: true,
                groupBy: 'category',
            });

            // Export to multiple formats
            const [csvPath, pdfPath, excelPath] = await Promise.all([
                activities.exportToCSV(salesReport.reportId),
                activities.exportToPDF(salesReport.reportId),
                activities.exportToExcel(salesReport.reportId),
            ]);

            // Upload to cloud storage
            const timestamp = new Date().toISOString().split('T')[0];
            const [csvUrl, pdfUrl, excelUrl] = await Promise.all([
                activities.uploadToS3(
                    csvPath,
                    'reports-bucket',
                    `sales/daily/${timestamp}/sales-report.csv`,
                ),
                activities.uploadToS3(
                    pdfPath,
                    'reports-bucket',
                    `sales/daily/${timestamp}/sales-report.pdf`,
                ),
                activities.uploadToS3(
                    excelPath,
                    'reports-bucket',
                    `sales/daily/${timestamp}/sales-report.xlsx`,
                ),
            ]);

            // Send notifications
            await Promise.all([
                activities.sendReportEmail(
                    ['sales@company.com', 'management@company.com'],
                    [pdfUrl, excelUrl],
                    'Daily Sales Report',
                ),
                activities.postToSlack(
                    '#sales',
                    `📊 Daily sales report is ready!\n` +
                        `💰 Revenue: $${salesReport.revenue.toLocaleString()}\n` +
                        `📦 Orders: ${salesReport.recordCount}\n` +
                        `📎 Download: [CSV](${csvUrl}) | [PDF](${pdfUrl}) | [Excel](${excelUrl})`,
                ),
            ]);

            this.lastReportGenerated = salesReport.reportId;
            this.totalReportsGenerated++;
        } catch (error) {
            this.lastError = error.message;

            await activities.postToSlack(
                '#alerts',
                `❌ Daily sales report failed: ${error.message}\n` +
                    `🕐 Time: ${new Date().toISOString()}\n` +
                    `🔧 Please check the reporting system.`,
            );

            throw error;
        }
    }

    @Cron('0 9 * * 1', {
        scheduleId: 'weekly-analytics-report',
        description: 'Generate weekly user analytics report',
    })
    @WorkflowMethod()
    async generateWeeklyAnalytics(): Promise<void> {
        if (!this.reportsEnabled) {
            return;
        }

        try {
            // Generate analytics report
            const analyticsReport = await activities.generateUserAnalytics('weekly');

            // Export to PDF for executives
            const pdfPath = await activities.exportToPDF(analyticsReport.reportId);
            const csvPath = await activities.exportToCSV(analyticsReport.reportId);

            // Upload to cloud storage
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];

            const [pdfUrl, csvUrl] = await Promise.all([
                activities.uploadToS3(
                    pdfPath,
                    'reports-bucket',
                    `analytics/weekly/${weekKey}/analytics-report.pdf`,
                ),
                activities.uploadToS3(
                    csvPath,
                    'reports-bucket',
                    `analytics/weekly/${weekKey}/analytics-report.csv`,
                ),
            ]);

            // Create interactive dashboard
            const dashboardUrl = await activities.createReportDashboard([
                {
                    type: 'analytics',
                    reportId: analyticsReport.reportId,
                    period: 'weekly',
                },
            ]);

            // Send to stakeholders
            await activities.sendReportEmail(
                ['analytics@company.com', 'product@company.com', 'ceo@company.com'],
                [pdfUrl, dashboardUrl],
                'Weekly User Analytics Report',
            );

            this.totalReportsGenerated++;
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }

    @Cron('0 0 1 * *', {
        scheduleId: 'monthly-financial-report',
        description: 'Generate monthly financial report',
    })
    @WorkflowMethod()
    async generateMonthlyFinancialReport(): Promise<void> {
        if (!this.reportsEnabled) {
            return;
        }

        try {
            // Generate comprehensive financial report
            const financialReport = await activities.generateFinancialReport('monthly');

            // Export to multiple formats for different audiences
            const [pdfPath, excelPath] = await Promise.all([
                activities.exportToPDF(financialReport.reportId),
                activities.exportToExcel(financialReport.reportId),
            ]);

            // Upload to secure location
            const month = new Date().toISOString().slice(0, 7); // YYYY-MM
            const [pdfUrl, excelUrl] = await Promise.all([
                activities.uploadToS3(
                    pdfPath,
                    'financial-reports-bucket',
                    `monthly/${month}/financial-report.pdf`,
                ),
                activities.uploadToS3(
                    excelPath,
                    'financial-reports-bucket',
                    `monthly/${month}/financial-report.xlsx`,
                ),
            ]);

            // Send to finance team and executives
            await activities.sendReportEmail(
                ['finance@company.com', 'cfo@company.com', 'ceo@company.com'],
                [pdfUrl, excelUrl],
                'Monthly Financial Report',
            );

            // Post summary to executive Slack channel
            await activities.postToSlack(
                '#executives',
                `📈 Monthly financial report is ready!\n` +
                    `💰 Revenue: $${financialReport.revenue.toLocaleString()}\n` +
                    `💸 Expenses: $${financialReport.expenses.toLocaleString()}\n` +
                    `📊 Profit: $${financialReport.profit.toLocaleString()}\n` +
                    `📎 [Download Report](${pdfUrl})`,
            );

            this.totalReportsGenerated++;
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }

    @Cron('0 2 1 */3 *', {
        scheduleId: 'quarterly-cleanup',
        description: 'Clean up old reports quarterly',
    })
    @WorkflowMethod()
    async cleanupOldReports(): Promise<void> {
        try {
            const deletedCount = await activities.archiveOldReports(90); // Keep 90 days

            await activities.postToSlack(
                '#ops',
                `🧹 Quarterly report cleanup completed.\n` +
                    `📦 Archived ${deletedCount} old reports.\n` +
                    `💾 Storage space optimized.`,
            );
        } catch (error) {
            this.lastError = error.message;
            throw error;
        }
    }

    @Signal('toggleReports')
    async toggleReports(enabled: boolean): Promise<void> {
        this.reportsEnabled = enabled;

        const status = enabled ? 'enabled' : 'disabled';
        await activities.postToSlack(
            '#ops',
            `📊 Reports have been ${status}.\n` + `⚠️ All scheduled reports will be ${status}.`,
        );
    }

    @Signal('generateAdHocReport')
    async generateAdHocReport(
        reportType: string,
        period: string,
        recipients: string[],
    ): Promise<void> {
        try {
            let reportResult;

            switch (reportType) {
                case 'sales':
                    reportResult = await activities.generateSalesReport(period);
                    break;
                case 'analytics':
                    reportResult = await activities.generateUserAnalytics(period);
                    break;
                case 'financial':
                    reportResult = await activities.generateFinancialReport(period);
                    break;
                default:
                    throw new Error(`Unknown report type: ${reportType}`);
            }

            const pdfPath = await activities.exportToPDF(reportResult.reportId);
            const reportUrl = await activities.uploadToS3(
                pdfPath,
                'reports-bucket',
                `adhoc/${reportType}-${period}-${Date.now()}.pdf`,
            );

            await activities.sendReportEmail(
                recipients,
                [reportUrl],
                `Ad-hoc ${reportType} Report`,
            );

            this.totalReportsGenerated++;
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

    @Query('areReportsEnabled')
    areReportsEnabled(): boolean {
        return this.reportsEnabled;
    }
}
```

## Health Monitoring System

System health monitoring with alerting and auto-remediation capabilities.

### Health Monitoring Activities

```typescript
// src/activities/health-monitoring.activities.ts
import { Injectable } from '@nestjs/common';
import { Activity, ActivityMethod } from 'nestjs-temporal-core';

export interface ServiceHealthCheck {
    serviceName: string;
    url: string;
    expectedStatus: number;
    timeout: number;
}

export interface DatabaseHealthCheck {
    connectionString: string;
    queryTimeout: number;
    testQuery: string;
}

@Injectable()
@Activity()
export class HealthMonitoringActivities {
    @ActivityMethod()
    async checkServiceHealth(service: ServiceHealthCheck): Promise<{
        healthy: boolean;
        responseTime: number;
        statusCode?: number;
        error?: string;
    }> {
        console.log(`Checking health of service: ${service.serviceName}`);

        const startTime = Date.now();

        try {
            // Simulate HTTP health check
            const responseTime = Math.random() * 2000 + 100; // 100-2100ms
            const statusCode = Math.random() < 0.95 ? 200 : 500; // 95% success rate

            await new Promise((resolve) => setTimeout(resolve, responseTime));

            const healthy = statusCode === service.expectedStatus;

            return {
                healthy,
                responseTime,
                statusCode,
                error: healthy ? undefined : `Service returned status ${statusCode}`,
            };
        } catch (error) {
            return {
                healthy: false,
                responseTime: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    @ActivityMethod()
    async checkDatabaseHealth(database: DatabaseHealthCheck): Promise<{
        healthy: boolean;
        responseTime: number;
        connectionCount?: number;
        error?: string;
    }> {
        console.log('Checking database health');

        const startTime = Date.now();

        try {
            // Simulate database health check
            const responseTime = Math.random() * 1000 + 50; // 50-1050ms
            const healthy = Math.random() < 0.98; // 98% success rate

            await new Promise((resolve) => setTimeout(resolve, responseTime));

            if (!healthy) {
                throw new Error('Database connection timeout');
            }

            const connectionCount = Math.floor(Math.random() * 100) + 10;

            return {
                healthy: true,
                responseTime,
                connectionCount,
            };
        } catch (error) {
            return {
                healthy: false,
                responseTime: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    @ActivityMethod()
    async checkQueueHealth(): Promise<{
        healthy: boolean;
        queueSize: number;
        processingRate: number;
        oldestMessage?: number;
    }> {
        console.log('Checking message queue health');

        // Simulate queue metrics
        const queueSize = Math.floor(Math.random() * 10000);
        const processingRate = Math.floor(Math.random() * 1000) + 100;
        const oldestMessage = Math.random() * 3600000; // Up to 1 hour old

        const healthy = queueSize < 5000 && oldestMessage < 1800000; // Less than 30 minutes

        return {
            healthy,
            queueSize,
            processingRate,
            oldestMessage,
        };
    }

    @ActivityMethod()
    async restartService(serviceName: string): Promise<{
        success: boolean;
        restartTime: number;
        error?: string;
    }> {
        console.log(`Attempting to restart service: ${serviceName}`);

        const startTime = Date.now();

        try {
            // Simulate service restart
            const restartDuration = Math.random() * 30000 + 5000; // 5-35 seconds
            await new Promise((resolve) => setTimeout(resolve, restartDuration));

            const success = Math.random() < 0.9; // 90% success rate

            if (!success) {
                throw new Error('Service restart failed');
            }

            return {
                success: true,
                restartTime: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                restartTime: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    @ActivityMethod()
    async scaleService(
        serviceName: string,
        targetInstances: number,
    ): Promise<{
        success: boolean;
        currentInstances: number;
        targetInstances: number;
        scalingTime: number;
    }> {
        console.log(`Scaling service ${serviceName} to ${targetInstances} instances`);

        const startTime = Date.now();
        const currentInstances = Math.floor(Math.random() * 5) + 1;

        // Simulate scaling operation
        const scalingDuration = Math.abs(targetInstances - currentInstances) * 10000; // 10s per instance
        await new Promise((resolve) => setTimeout(resolve, scalingDuration));

        const success = Math.random() < 0.95; // 95% success rate

        return {
            success,
            currentInstances: success ? targetInstances : currentInstances,
            targetInstances,
            scalingTime: Date.now() - startTime,
        };
    }

    @ActivityMethod()
    async sendAlert(
        severity: 'info' | 'warning' | 'critical',
        message: string,
        details?: any,
    ): Promise<void> {
        console.log(`🚨 Alert [${severity.toUpperCase()}]: ${message}`);

        if (details) {
            console.log('Details:', JSON.stringify(details, null, 2));
        }

        // In real app: send to PagerDuty, Slack, email, etc.
        const alertChannels = {
            info: ['#alerts-info'],
            warning: ['#alerts-warning', '#ops'],
            critical: ['#alerts-critical', '#ops', '#oncall'],
        };

        for (const channel of alertChannels[severity]) {
            console.log(`Sending alert to ${channel}`);
        }
    }

    @ActivityMethod()
    async recordMetric(
        metricName: string,
        value: number,
        tags: Record<string, string>,
    ): Promise<void> {
        console.log(`📊 Metric: ${metricName} = ${value}`, tags);

        // In real app: send to Datadog, CloudWatch, Prometheus, etc.
    }

    @ActivityMethod()
    async createIncident(title: string, description: string, severity: string): Promise<string> {
        const incidentId = `INC-${Date.now()}-${Math.random().toString(36).slice(2).toUpperCase()}`;

        console.log(`🚨 Created incident ${incidentId}: ${title}`);
        console.log(`Severity: ${severity}`);
        console.log(`Description: ${description}`);

        // In real app: create incident in PagerDuty, Jira, etc.

        return incidentId;
    }

    @ActivityMethod()
    async resolveIncident(incidentId: string, resolution: string): Promise<void> {
        console.log(`✅ Resolved incident ${incidentId}: ${resolution}`);

        // In real app: update incident management system
    }
}
```

### Health Monitoring Workflow Controller

```typescript
// src/workflows/health-monitoring.controller.ts
import { WorkflowController, WorkflowMethod, Interval, Signal, Query } from 'nestjs-temporal-core';
import { proxyActivities, sleep } from '@temporalio/workflow';

interface HealthMonitoringActivities {
    checkServiceHealth(service: any): Promise<{
        healthy: boolean;
        responseTime: number;
        statusCode?: number;
        error?: string;
    }>;
    checkDatabaseHealth(database: any): Promise<{
        healthy: boolean;
        responseTime: number;
        connectionCount?: number;
        error?: string;
    }>;
    checkQueueHealth(): Promise<{
        healthy: boolean;
        queueSize: number;
        processingRate: number;
        oldestMessage?: number;
    }>;
    restartService(serviceName: string): Promise<{
        success: boolean;
        restartTime: number;
        error?: string;
    }>;
    scaleService(
        serviceName: string,
        targetInstances: number,
    ): Promise<{
        success: boolean;
        currentInstances: number;
        targetInstances: number;
        scalingTime: number;
    }>;
    sendAlert(
        severity: 'info' | 'warning' | 'critical',
        message: string,
        details?: any,
    ): Promise<void>;
    recordMetric(metricName: string, value: number, tags: Record<string, string>): Promise<void>;
    createIncident(title: string, description: string, severity: string): Promise<string>;
    resolveIncident(incidentId: string, resolution: string): Promise<void>;
}

const activities = proxyActivities<HealthMonitoringActivities>({
    startToCloseTimeout: '2m',
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
    private activeIncidents: Map<string, string> = new Map();
    private serviceMetrics: Map<string, any> = new Map();

    @Interval('30s', {
        scheduleId: 'health-check',
        description: 'Continuous system health monitoring',
    })
    @WorkflowMethod()
    async monitorSystemHealth(): Promise<void> {
        this.lastCheckTime = new Date();

        try {
            // Check all system components
            const [apiHealth, dbHealth, queueHealth] = await Promise.all([
                activities.checkServiceHealth({
                    serviceName: 'api-service',
                    url: 'http://api:8080/health',
                    expectedStatus: 200,
                    timeout: 5000,
                }),
                activities.checkDatabaseHealth({
                    connectionString: 'postgresql://localhost:5432/app',
                    queryTimeout: 5000,
                    testQuery: 'SELECT 1',
                }),
                activities.checkQueueHealth(),
            ]);

            // Record metrics for all services
            await this.recordHealthMetrics('api-service', apiHealth);
            await this.recordHealthMetrics('database', dbHealth);
            await this.recordHealthMetrics('message-queue', queueHealth);

            // Determine overall system health
            const allHealthy = apiHealth.healthy && dbHealth.healthy && queueHealth.healthy;
            const anyDegraded = !queueHealth.healthy && queueHealth.queueSize > 1000;

            if (!allHealthy) {
                this.consecutiveFailures++;
                this.overallHealth = 'unhealthy';

                await this.handleUnhealthyState(apiHealth, dbHealth, queueHealth);
            } else if (anyDegraded) {
                this.consecutiveFailures++;
                this.overallHealth = 'degraded';

                await this.handleDegradedState(queueHealth);
            } else {
                // System is healthy
                if (this.overallHealth !== 'healthy') {
                    // System recovered
                    await this.handleRecovery();
                }

                this.overallHealth = 'healthy';
                this.consecutiveFailures = 0;
            }
        } catch (error) {
            this.consecutiveFailures++;
            this.overallHealth = 'unhealthy';

            await activities.sendAlert('critical', `Health check failed: ${error.message}`);
            this.addAlert('critical', `Health check failed: ${error.message}`);
        }
    }

    private async recordHealthMetrics(serviceName: string, health: any): Promise<void> {
        const tags = { service: serviceName };

        await activities.recordMetric('service.healthy', health.healthy ? 1 : 0, tags);
        await activities.recordMetric('service.response_time', health.responseTime, tags);

        if (health.statusCode) {
            await activities.recordMetric('service.status_code', health.statusCode, tags);
        }

        if (health.connectionCount) {
            await activities.recordMetric('database.connections', health.connectionCount, tags);
        }

        if (health.queueSize !== undefined) {
            await activities.recordMetric('queue.size', health.queueSize, tags);
            await activities.recordMetric(
                'queue.processing_rate',
                health.processingRate || 0,
                tags,
            );
        }

        // Store for queries
        this.serviceMetrics.set(serviceName, {
            ...health,
            lastUpdated: new Date(),
        });
    }

    private async handleUnhealthyState(
        apiHealth: any,
        dbHealth: any,
        queueHealth: any,
    ): Promise<void> {
        const issues: string[] = [];

        // API Service Issues
        if (!apiHealth.healthy) {
            issues.push(`API service is unhealthy (${apiHealth.error})`);

            if (this.autoRemediationEnabled && this.consecutiveFailures >= 3) {
                const restart = await activities.restartService('api-service');
                if (restart.success) {
                    issues.push('API service restart initiated');
                    await activities.sendAlert('info', 'API service restarted automatically');
                } else {
                    const incidentId = await activities.createIncident(
                        'API Service Down',
                        `API service is unhealthy and restart failed: ${restart.error}`,
                        'high',
                    );
                    this.activeIncidents.set('api-service', incidentId);
                    issues.push('API service restart failed - incident created');
                }
            }
        }

        // Database Issues
        if (!dbHealth.healthy) {
            issues.push(`Database is unhealthy (${dbHealth.error})`);

            if (this.consecutiveFailures >= 5) {
                const incidentId = await activities.createIncident(
                    'Database Connection Issues',
                    `Database health check failing: ${dbHealth.error}`,
                    'critical',
                );
                this.activeIncidents.set('database', incidentId);
            }
        }

        // Queue Issues
        if (!queueHealth.healthy) {
            issues.push(`Message queue is unhealthy`);

            if (this.autoRemediationEnabled && queueHealth.queueSize > 10000) {
                await activities.scaleService('queue-worker', 5);
                issues.push('Scaled up queue workers for high queue size');
            }
        }

        // Send alerts for all issues
        for (const issue of issues) {
            await activities.sendAlert('critical', issue);
            this.addAlert('critical', issue);
        }
    }

    private async handleDegradedState(queueHealth: any): Promise<void> {
        if (queueHealth.queueSize > 5000) {
            const message = `Queue size is high: ${queueHealth.queueSize}`;
            await activities.sendAlert('warning', message);
            this.addAlert('warning', message);

            if (this.autoRemediationEnabled && queueHealth.queueSize > 8000) {
                const scaling = await activities.scaleService('queue-worker', 3);
                if (scaling.success) {
                    await activities.sendAlert(
                        'info',
                        `Scaled queue workers to ${scaling.currentInstances} instances`,
                    );
                }
            }
        }

        if (queueHealth.oldestMessage && queueHealth.oldestMessage > 1800000) {
            // 30 minutes
            const ageMinutes = Math.round(queueHealth.oldestMessage / 60000);
            await activities.sendAlert(
                'warning',
                `Oldest message in queue is ${ageMinutes} minutes old`,
            );
            this.addAlert('warning', `Message processing lag: ${ageMinutes} minutes`);
        }
    }

    private async handleRecovery(): Promise<void> {
        await activities.sendAlert('info', 'System health restored to normal');
        this.addAlert('info', 'System health restored');

        // Resolve any active incidents
        for (const [service, incidentId] of this.activeIncidents.entries()) {
            await activities.resolveIncident(
                incidentId,
                `${service} health restored automatically`,
            );
        }
        this.activeIncidents.clear();
    }

    private addAlert(severity: string, message: string): void {
        this.alerts.push({
            time: new Date(),
            severity,
            message,
        });

        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts = this.alerts.slice(-50);
        }
    }

    @Signal('toggleAutoRemediation')
    async toggleAutoRemediation(): Promise<void> {
        this.autoRemediationEnabled = !this.autoRemediationEnabled;

        const message = `Auto-remediation ${this.autoRemediationEnabled ? 'enabled' : 'disabled'}`;
        await activities.sendAlert('info', message);
        this.addAlert('info', message);
    }

    @Signal('forceHealthCheck')
    async forceHealthCheck(): Promise<void> {
        // Trigger immediate health check
        await this.monitorSystemHealth();
    }

    @Signal('restartService')
    async manualRestartService(serviceName: string): Promise<void> {
        const restart = await activities.restartService(serviceName);

        if (restart.success) {
            await activities.sendAlert('info', `Service ${serviceName} restarted manually`);
            this.addAlert('info', `Manual restart: ${serviceName}`);
        } else {
            await activities.sendAlert(
                'warning',
                `Failed to restart ${serviceName}: ${restart.error}`,
            );
            this.addAlert('warning', `Manual restart failed: ${serviceName}`);
        }
    }

    @Signal('scaleService')
    async manualScaleService(serviceName: string, instances: number): Promise<void> {
        const scaling = await activities.scaleService(serviceName, instances);

        if (scaling.success) {
            await activities.sendAlert(
                'info',
                `Service ${serviceName} scaled to ${scaling.currentInstances} instances`,
            );
            this.addAlert('info', `Manual scaling: ${serviceName} to ${instances} instances`);
        } else {
            await activities.sendAlert('warning', `Failed to scale ${serviceName}`);
            this.addAlert('warning', `Manual scaling failed: ${serviceName}`);
        }
    }

    @Query('getHealthStatus')
    getHealthStatus(): {
        overall: string;
        lastCheck: Date | undefined;
        consecutiveFailures: number;
        autoRemediationEnabled: boolean;
        activeIncidents: number;
    } {
        return {
            overall: this.overallHealth,
            lastCheck: this.lastCheckTime,
            consecutiveFailures: this.consecutiveFailures,
            autoRemediationEnabled: this.autoRemediationEnabled,
            activeIncidents: this.activeIncidents.size,
        };
    }

    @Query('getServiceMetrics')
    getServiceMetrics(): Record<string, any> {
        const metrics: Record<string, any> = {};

        for (const [serviceName, data] of this.serviceMetrics.entries()) {
            metrics[serviceName] = data;
        }

        return metrics;
    }

    @Query('getRecentAlerts')
    getRecentAlerts(count = 10): Array<{ time: Date; severity: string; message: string }> {
        return this.alerts.slice(-count);
    }

    @Query('getActiveIncidents')
    getActiveIncidents(): Array<{ service: string; incidentId: string }> {
        return Array.from(this.activeIncidents.entries()).map(([service, incidentId]) => ({
            service,
            incidentId,
        }));
    }
}
```

## Multi-Tenant Application

Managing workflows across multiple tenants with isolation and resource management.

### Multi-Tenant Service

```typescript
// src/services/multi-tenant.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalService } from 'nestjs-temporal-core';

export interface Tenant {
    tenantId: string;
    name: string;
    tier: 'basic' | 'premium' | 'enterprise';
    limits: {
        maxWorkflows: number;
        maxConcurrentWorkflows: number;
        maxSchedules: number;
    };
    config: {
        namespace?: string;
        taskQueue?: string;
        retentionDays: number;
    };
}

@Injectable()
export class MultiTenantService {
    constructor(private readonly temporal: TemporalService) {}

    async startTenantWorkflow(
        tenantId: string,
        workflowType: string,
        args: any[],
        options: any = {},
    ): Promise<{ workflowId: string; result: Promise<any> }> {
        const tenant = await this.getTenant(tenantId);

        // Check tenant limits
        await this.checkTenantLimits(tenant);

        // Add tenant context to workflow
        const tenantOptions = {
            ...options,
            workflowId: options.workflowId || `${tenantId}-${workflowType}-${Date.now()}`,
            taskQueue: tenant.config.taskQueue || `tenant-${tenantId}`,
            searchAttributes: {
                ...options.searchAttributes,
                'tenant-id': tenantId,
                'tenant-tier': tenant.tier,
            },
            memo: {
                ...options.memo,
                tenantId,
                tenantName: tenant.name,
            },
        };

        return await this.temporal.startWorkflow(workflowType, args, tenantOptions);
    }

    async getTenantWorkflows(tenantId: string): Promise<any[]> {
        // Query workflows for specific tenant
        const client = this.temporal.getClient();
        const handle = client.getWorkflowHandle('list-workflows');

        // Use search attributes to filter by tenant
        const query = `WorkflowType = "processOrder" AND CustomKeywordField = "${tenantId}"`;

        const workflows = [];
        for await (const workflow of client.listWorkflows({ query })) {
            workflows.push(workflow);
        }

        return workflows;
    }

    async getTenantMetrics(tenantId: string): Promise<{
        activeWorkflows: number;
        completedWorkflows: number;
        failedWorkflows: number;
        averageDuration: number;
    }> {
        // In real app: query metrics from monitoring system
        return {
            activeWorkflows: Math.floor(Math.random() * 10),
            completedWorkflows: Math.floor(Math.random() * 1000),
            failedWorkflows: Math.floor(Math.random() * 50),
            averageDuration: Math.random() * 300000, // milliseconds
        };
    }

    private async getTenant(tenantId: string): Promise<Tenant> {
        // In real app: fetch from database
        return {
            tenantId,
            name: `Tenant ${tenantId}`,
            tier: 'premium',
            limits: {
                maxWorkflows: 1000,
                maxConcurrentWorkflows: 50,
                maxSchedules: 10,
            },
            config: {
                taskQueue: `tenant-${tenantId}`,
                retentionDays: 30,
            },
        };
    }

    private async checkTenantLimits(tenant: Tenant): Promise<void> {
        const metrics = await this.getTenantMetrics(tenant.tenantId);

        if (metrics.activeWorkflows >= tenant.limits.maxConcurrentWorkflows) {
            throw new Error(`Tenant ${tenant.tenantId} has reached concurrent workflow limit`);
        }

        // Additional limit checks can be added here
    }
}
```

## Testing Strategies

Comprehensive testing approaches for Temporal workflows.

### Unit Testing Activities

```typescript
// src/activities/__tests__/order.activities.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrderActivities, Order, OrderItem } from '../order.activities';

describe('OrderActivities', () => {
    let activities: OrderActivities;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [OrderActivities],
        }).compile();

        activities = module.get<OrderActivities>(OrderActivities);
    });

    describe('validateOrder', () => {
        it('should validate a valid order', async () => {
            const order: Order = {
                orderId: 'order-123',
                customerId: 'customer-456',
                items: [{ productId: 'product-1', quantity: 2, price: 10.0 }],
                totalAmount: 20.0,
            };

            const result = await activities.validateOrder(order);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject order without customer ID', async () => {
            const order: Order = {
                orderId: 'order-123',
                customerId: '',
                items: [{ productId: 'product-1', quantity: 2, price: 10.0 }],
                totalAmount: 20.0,
            };

            const result = await activities.validateOrder(order);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Customer ID is required');
        });

        it('should reject order with zero total', async () => {
            const order: Order = {
                orderId: 'order-123',
                customerId: 'customer-456',
                items: [{ productId: 'product-1', quantity: 2, price: 10.0 }],
                totalAmount: 0,
            };

            const result = await activities.validateOrder(order);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Order total must be greater than zero');
        });
    });

    describe('reserveInventory', () => {
        it('should successfully reserve available inventory', async () => {
            const items: OrderItem[] = [{ productId: 'product-1', quantity: 2, price: 10.0 }];

            // Mock the private method
            jest.spyOn(activities as any, 'getAvailableQuantity').mockResolvedValue(10);

            const result = await activities.reserveInventory(items);

            expect(result.success).toBe(true);
            expect(result.reservationId).toBeDefined();
            expect(result.unavailableItems).toBeUndefined();
        });

        it('should fail when inventory is insufficient', async () => {
            const items: OrderItem[] = [{ productId: 'product-1', quantity: 20, price: 10.0 }];

            // Mock insufficient inventory
            jest.spyOn(activities as any, 'getAvailableQuantity').mockResolvedValue(5);

            const result = await activities.reserveInventory(items);

            expect(result.success).toBe(false);
            expect(result.unavailableItems).toHaveLength(1);
            expect(result.unavailableItems![0].productId).toBe('product-1');
        });
    });
});
```

### Integration Testing Workflows

```typescript
// src/workflows/__tests__/order.controller.integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TemporalModule, TemporalService } from 'nestjs-temporal-core';
import { OrderActivities } from '../activities/order.activities';
import { OrderWorkflowController } from '../workflows/order.controller';
import { TestEnvironment } from '@temporalio/testing';

describe('OrderWorkflowController Integration', () => {
    let temporalService: TemporalService;
    let testEnv: TestEnvironment;

    beforeAll(async () => {
        // Set up Temporal test environment
        testEnv = await TestEnvironment.createTimeSkipping();
    });

    afterAll(async () => {
        await testEnv?.teardown();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                TemporalModule.register({
                    connection: {
                        address: testEnv.nativeConnection.address,
                        namespace: testEnv.nativeConnection.workflowService.namespace,
                    },
                    taskQueue: 'test-orders',
                    worker: {
                        workflowsPath: require.resolve('../workflows'),
                        activityClasses: [OrderActivities],
                        autoStart: false, // Manual control in tests
                    },
                }),
            ],
            providers: [OrderActivities],
            controllers: [OrderWorkflowController],
        }).compile();

        temporalService = module.get<TemporalService>(TemporalService);

        // Start worker for tests
        if (temporalService.hasWorker()) {
            await temporalService.getWorkerManager()?.startWorker();
        }
    });

    afterEach(async () => {
        if (temporalService.hasWorker()) {
            await temporalService.getWorkerManager()?.shutdown();
        }
    });

    it('should process a valid order successfully', async () => {
        const order = {
            orderId: 'test-order-1',
            customerId: 'test-customer-1',
            items: [{ productId: 'product-1', quantity: 2, price: 10.0 }],
            totalAmount: 20.0,
        };

        const { workflowId, result } = await temporalService.startWorkflow(
            'processOrder',
            [order],
            {
                taskQueue: 'test-orders',
                workflowId: 'test-process-order-1',
            },
        );

        // Wait for workflow completion
        const workflowResult = await result;

        expect(workflowResult.status).toBe('completed');
        expect(workflowResult.trackingNumber).toBeDefined();

        // Query final status
        const finalStatus = await temporalService.queryWorkflow(workflowId, 'getStatus');
        expect(finalStatus).toBe('completed');
    });

    it('should handle order cancellation', async () => {
        const order = {
            orderId: 'test-order-2',
            customerId: 'test-customer-2',
            items: [{ productId: 'product-1', quantity: 1, price: 15.0 }],
            totalAmount: 15.0,
        };

        const { workflowId } = await temporalService.startWorkflow('processOrder', [order], {
            taskQueue: 'test-orders',
            workflowId: 'test-cancel-order-1',
        });

        // Wait a bit then cancel
        await new Promise((resolve) => setTimeout(resolve, 1000));

        await temporalService.signalWorkflow(workflowId, 'cancelOrder', [
            'Customer requested cancellation',
        ]);

        // Check that order was cancelled
        const status = await temporalService.queryWorkflow(workflowId, 'getStatus');
        expect(status).toBe('cancelled');

        const isCancelled = await temporalService.queryWorkflow(workflowId, 'isCancelled');
        expect(isCancelled).toBe(true);
    });

    it('should handle payment failures with compensation', async () => {
        // Mock payment failure
        const orderActivities = module.get<OrderActivities>(OrderActivities);
        jest.spyOn(orderActivities, 'processPayment').mockResolvedValue({
            success: false,
            error: 'Payment declined',
        });

        const order = {
            orderId: 'test-order-3',
            customerId: 'test-customer-3',
            items: [{ productId: 'product-1', quantity: 1, price: 25.0 }],
            totalAmount: 25.0,
        };

        await expect(
            temporalService
                .startWorkflow('processOrder', [order], {
                    taskQueue: 'test-orders',
                    workflowId: 'test-payment-failure-1',
                })
                .then(({ result }) => result),
        ).rejects.toThrow('Payment failed: Payment declined');
    });
});
```

### End-to-End Testing

```typescript
// src/__tests__/e2e/order-flow.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { TemporalService } from 'nestjs-temporal-core';

describe('Order Flow E2E', () => {
    let app: INestApplication;
    let temporalService: TemporalService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        temporalService = moduleFixture.get<TemporalService>(TemporalService);

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should complete full order processing flow', async () => {
        // Step 1: Create order via API
        const orderData = {
            customerId: 'e2e-customer-1',
            items: [
                { productId: 'product-1', quantity: 2, price: 10.0 },
                { productId: 'product-2', quantity: 1, price: 5.0 },
            ],
            paymentMethod: 'credit_card',
        };

        const createResponse = await request(app.getHttpServer())
            .post('/orders')
            .send(orderData)
            .expect(201);

        const { orderId, workflowId } = createResponse.body;
        expect(orderId).toBeDefined();
        expect(workflowId).toBeDefined();

        // Step 2: Check initial status
        const statusResponse = await request(app.getHttpServer())
            .get(`/orders/${orderId}/status`)
            .expect(200);

        expect(statusResponse.body.status).toBe('processing');

        // Step 3: Wait for workflow completion (with timeout)
        let completed = false;
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds

        while (!completed && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const currentStatus = await temporalService.queryWorkflow(workflowId, 'getStatus');

            if (currentStatus === 'completed' || currentStatus === 'failed') {
                completed = true;
            }

            attempts++;
        }

        expect(completed).toBe(true);

        // Step 4: Verify final status
        const finalStatusResponse = await request(app.getHttpServer())
            .get(`/orders/${orderId}/status`)
            .expect(200);

        expect(finalStatusResponse.body.status).toBe('completed');
        expect(finalStatusResponse.body.trackingNumber).toBeDefined();
        expect(finalStatusResponse.body.progress).toBe(100);
    });

    it('should handle order cancellation flow', async () => {
        // Create order
        const orderData = {
            customerId: 'e2e-customer-2',
            items: [{ productId: 'product-3', quantity: 1, price: 20.0 }],
            paymentMethod: 'credit_card',
        };

        const createResponse = await request(app.getHttpServer())
            .post('/orders')
            .send(orderData)
            .expect(201);

        const { orderId } = createResponse.body;

        // Cancel order
        await request(app.getHttpServer())
            .post(`/orders/${orderId}/cancel`)
            .send({ reason: 'Customer changed mind' })
            .expect(200);

        // Wait a bit for cancellation processing
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Verify cancellation
        const statusResponse = await request(app.getHttpServer())
            .get(`/orders/${orderId}/status`)
            .expect(200);

        expect(['cancelling', 'cancelled']).toContain(statusResponse.body.status);
        expect(statusResponse.body.cancelled).toBe(true);
    });
});
```

### Mock Testing with Temporal Test Environment

```typescript
// src/__tests__/utils/temporal-test-utils.ts
import { TestEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

export class TemporalTestUtils {
    private static testEnv: TestEnvironment;
    private static workers: Worker[] = [];

    static async setupTestEnvironment(): Promise<TestEnvironment> {
        if (!this.testEnv) {
            this.testEnv = await TestEnvironment.createTimeSkipping();
        }
        return this.testEnv;
    }

    static async teardownTestEnvironment(): Promise<void> {
        // Shutdown all workers
        await Promise.all(this.workers.map((worker) => worker.shutdown()));
        this.workers = [];

        // Teardown test environment
        if (this.testEnv) {
            await this.testEnv.teardown();
        }
    }

    static async createWorker(
        taskQueue: string,
        workflowsPath: string,
        activities: any,
    ): Promise<Worker> {
        const worker = await Worker.create({
            connection: this.testEnv.nativeConnection,
            namespace: this.testEnv.nativeConnection.workflowService.namespace,
            taskQueue,
            workflowsPath,
            activities,
        });

        this.workers.push(worker);
        return worker;
    }

    static async runWorker(worker: Worker, fn: () => Promise<void>): Promise<void> {
        const runPromise = worker.run();

        try {
            await fn();
        } finally {
            worker.shutdown();
            await runPromise;
        }
    }

    static async advanceTime(duration: string | number): Promise<void> {
        if (this.testEnv) {
            const ms = typeof duration === 'string' ? this.parseDuration(duration) : duration;
            await this.testEnv.sleep(ms);
        }
    }

    private static parseDuration(duration: string): number {
        const units = {
            ms: 1,
            s: 1000,
            m: 60000,
            h: 3600000,
            d: 86400000,
        };

        const match = duration.match(/^(\d+)([smhd]?)$/);
        if (!match) throw new Error(`Invalid duration: ${duration}`);

        const [, value, unit = 'ms'] = match;
        return parseInt(value) * units[unit];
    }
}
```

This comprehensive examples guide demonstrates real-world patterns and use cases for NestJS Temporal Core, showing how to build production-ready workflows with proper error handling, compensation patterns, monitoring, and testing strategies.

---

**[← API Reference](./api-reference.md)** | **[Back to README →](../README.md)**
