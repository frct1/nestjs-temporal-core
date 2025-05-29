/**
 * Re-export all decorators for easier imports
 */

// ==========================================
// Activity decorators
// ==========================================
export * from './activity.decorator';
export * from './activity-method.decorator';

// ==========================================
// Traditional workflow decorators
// ==========================================
export * from './workflow.decorator';
export * from './workflow-method.decorator';
export * from './signal-method.decorator';
export * from './query-method.decorator';

// ==========================================
// Workflow controller decorators
// ==========================================
export * from './workflow-controller.decorator';
export * from './signal.decorator';
export * from './query.decorator';

// ==========================================
// Scheduling decorators
// ==========================================
export * from './scheduled.decorator';
export * from './cron.decorator';
export * from './interval.decorator';

// ==========================================
// Parameter decorators
// ==========================================
export * from './workflow-param.decorator';
export * from './workflow-context.decorator';

// ==========================================
// Service method decorators
// ==========================================
export * from './workflow-starter.decorator';

/**
 * Usage examples:
 *
 * Activity definition (existing pattern):
 * ```typescript
 * import { Activity, ActivityMethod } from 'nestjs-temporal-core';
 *
 * @Activity()
 * export class EmailActivities {
 *   @ActivityMethod()
 *   async sendEmail(to: string): Promise<boolean> {
 *     // Send email implementation
 *     return true;
 *   }
 * }
 * ```
 *
 * Workflow Controller (NEW NestJS-like pattern):
 * ```typescript
 * import {
 *   WorkflowController,
 *   WorkflowMethod,
 *   Signal,
 *   Query,
 *   Cron,
 *   WorkflowParam
 * } from 'nestjs-temporal-core';
 *
 * @WorkflowController({ taskQueue: 'orders' })
 * export class OrderController {
 *   private status = 'pending';
 *
 *   @WorkflowMethod()
 *   async processOrder(@WorkflowParam() orderId: string): Promise<string> {
 *     this.status = 'processing';
 *     // Workflow implementation
 *     this.status = 'completed';
 *     return this.status;
 *   }
 *
 *   @Signal('addItem')
 *   async addItem(@WorkflowParam() item: any): void {
 *     // Handle signal
 *   }
 *
 *   @Query()
 *   getStatus(): string {
 *     return this.status;
 *   }
 *
 *   @Cron('0 8 * * *', {
 *     scheduleId: 'daily-cleanup',
 *     description: 'Daily cleanup'
 *   })
 *   @WorkflowMethod()
 *   async dailyCleanup(): Promise<void> {
 *     // Scheduled workflow
 *   }
 * }
 * ```
 *
 * Service with Workflow Starter:
 * ```typescript
 * import { WorkflowStarter } from 'nestjs-temporal-core';
 *
 * @Injectable()
 * export class OrderService {
 *   @WorkflowStarter({
 *     workflowType: 'processOrder',
 *     taskQueue: 'orders'
 *   })
 *   async processOrder(orderId: string): Promise<WorkflowHandle> {
 *     // Implementation auto-generated
 *   }
 * }
 * ```
 */
