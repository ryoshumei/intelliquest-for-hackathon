import { EventHandler } from '@/application/services/EventBus';
import { SurveyCreatedEvent } from '@/domain/survey/events/SurveyCreatedEvent';

/**
 * Email Notification Handler
 * 当问卷创建时发送通知邮件
 */
export class EmailNotificationHandler implements EventHandler<SurveyCreatedEvent> {
  async handle(event: SurveyCreatedEvent): Promise<void> {
    console.log(`📧 EmailNotificationHandler: Sending notification email for survey "${event.getTitle()}"`);
    
    // 模拟发送邮件的过程
    await this.delay(100);
    
    console.log(`📧 EmailNotificationHandler: Email sent successfully to survey creator`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Statistics Update Handler  
 * 当问卷创建时更新统计数据
 */
export class StatisticsUpdateHandler implements EventHandler<SurveyCreatedEvent> {
  async handle(event: SurveyCreatedEvent): Promise<void> {
    console.log(`📊 StatisticsUpdateHandler: Updating statistics for survey creation`);
    
    // 模拟更新统计数据
    await this.delay(50);
    
    const stats = {
      totalSurveys: 'incremented',
      surveyTitle: event.getTitle(),
      createdBy: event.getCreatedBy()
    };
    
    console.log(`📊 StatisticsUpdateHandler: Statistics updated:`, stats);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Audit Log Handler
 * 记录问卷创建的审计日志
 */
export class AuditLogHandler implements EventHandler<SurveyCreatedEvent> {
  async handle(event: SurveyCreatedEvent): Promise<void> {
    console.log(`📝 AuditLogHandler: Creating audit log entry`);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      action: 'SURVEY_CREATED',
      surveyId: event.getSurveyId(),
      createdBy: event.getCreatedBy(),
      surveyTitle: event.getTitle()
    };
    
    // 模拟写入日志
    await this.delay(30);
    
    console.log(`📝 AuditLogHandler: Audit log created:`, logEntry);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Cache Invalidation Handler
 * 当问卷创建时清除相关缓存
 */
export class CacheInvalidationHandler implements EventHandler<SurveyCreatedEvent> {
  async handle(event: SurveyCreatedEvent): Promise<void> {
    const createdBy = event.getCreatedBy() || 'unknown';
    console.log(`🗑️ CacheInvalidationHandler: Invalidating caches for user ${createdBy}`);
    
    const cachesToClear = [
      `user_surveys_${createdBy}`,
      'survey_statistics',
      'recent_surveys'
    ];
    
    // 模拟清除缓存
    await this.delay(20);
    
    console.log(`🗑️ CacheInvalidationHandler: Cleared caches:`, cachesToClear);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 