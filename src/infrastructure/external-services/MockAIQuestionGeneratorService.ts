import { Question } from '@/domain/survey/entities/Question';
import { QuestionType } from '@/domain/survey/value-objects/QuestionType';
import { AIQuestionGeneratorService } from '@/application/services/AIQuestionGeneratorService';
import { AIGenerationParams } from '@/application/use-cases/CreateSurveyUseCase';

/**
 * Mock AI Question Generator Service for testing and demo purposes
 * In production, this would be replaced with a real Vertex AI implementation
 */
export class MockAIQuestionGeneratorService implements AIQuestionGeneratorService {
  private generationCount = 0;

  async generateQuestions(params: AIGenerationParams): Promise<Question[]> {
    // Simulate AI processing delay
    await this.delay(1500);

    this.generationCount++;
    console.log(`MockAIService: Generating ${params.questionCount} questions for topic: ${params.topic}`);

    const questions: Question[] = [];

    // Generate questions based on the topic
    const questionTemplates = this.getQuestionTemplates(params.topic);
    
    for (let i = 0; i < params.questionCount && i < questionTemplates.length; i++) {
      const template = questionTemplates[i];
      const question = Question.createAIGenerated(
        template.text,
        template.type,
        template.options
      );
      questions.push(question);
    }

    console.log(`MockAIService: Generated ${questions.length} questions successfully`);
    return questions;
  }

  async improveQuestions(questions: Question[], context: string): Promise<Question[]> {
    await this.delay(1000);

    console.log(`MockAIService: Improving ${questions.length} questions with context: ${context}`);

    // Simulate question improvement by adding prefixes
    return questions.map(q => {
      const improvedText = `[Improved] ${q.getText()}`;
      return Question.createAIGenerated(
        improvedText,
        q.getType(),
        q.getOptions()
      );
    });
  }

  async generateFollowUpQuestions(
    existingQuestions: Question[],
    topic: string,
    count: number
  ): Promise<Question[]> {
    await this.delay(1200);

    console.log(`MockAIService: Generating ${count} follow-up questions for topic: ${topic}`);

    const followUpTemplates = [
      {
        text: `Based on your previous answers about ${topic}, what would you like to see improved?`,
        type: QuestionType.textarea(),
        options: []
      },
      {
        text: `How satisfied are you with current ${topic} solutions?`,
        type: QuestionType.scale(),
        options: ['Very Unsatisfied', 'Very Satisfied']
      },
      {
        text: `Would you recommend our ${topic} approach to others?`,
        type: QuestionType.yesNo(),
        options: ['Yes', 'No']
      }
    ];

    const questions: Question[] = [];
    for (let i = 0; i < count && i < followUpTemplates.length; i++) {
      const template = followUpTemplates[i];
      const question = Question.createAIGenerated(
        template.text,
        template.type,
        template.options
      );
      questions.push(question);
    }

    return questions;
  }

  async isAvailable(): Promise<boolean> {
    await this.delay(100);
    return true; // Mock service is always available
  }

  getSupportedQuestionTypes(): string[] {
    return [
      'text',
      'textarea', 
      'single_choice',
      'multiple_choice',
      'scale',
      'yes_no',
      'email',
      'number'
    ];
  }

  // Helper methods
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getQuestionTemplates(topic: string): Array<{
    text: string;
    type: QuestionType;
    options: string[];
  }> {
    const topicLower = topic.toLowerCase();

    // Different question sets based on topic
    if (topicLower.includes('用户体验') || topicLower.includes('ux') || topicLower.includes('user experience')) {
      return [
        {
          text: '您对我们产品的整体用户体验满意度如何？',
          type: QuestionType.scale(),
          options: ['非常不满意', '非常满意']
        },
        {
          text: '在使用过程中遇到的最大困难是什么？',
          type: QuestionType.textarea(),
          options: []
        },
        {
          text: '您认为哪个功能最有用？',
          type: QuestionType.singleChoice(),
          options: ['导航功能', '搜索功能', '个人化设置', '数据分析', '其他']
        },
        {
          text: '您希望我们优先改进的方面有哪些？（可多选）',
          type: QuestionType.multipleChoice(),
          options: ['页面加载速度', '界面设计', '功能完整性', '操作便利性', '客户服务']
        },
        {
          text: '您会向朋友推荐我们的产品吗？',
          type: QuestionType.yesNo(),
          options: ['会', '不会']
        }
      ];
    }

    if (topicLower.includes('产品') || topicLower.includes('product')) {
      return [
        {
          text: '您多久使用一次我们的产品？',
          type: QuestionType.singleChoice(),
          options: ['每天', '每周', '每月', '很少使用']
        },
        {
          text: '产品的哪些特性对您最重要？',
          type: QuestionType.multipleChoice(),
          options: ['价格', '质量', '功能', '外观设计', '品牌信誉']
        },
        {
          text: '您对产品价格的看法？',
          type: QuestionType.scale(),
          options: ['太便宜', '太贵']
        },
        {
          text: '请描述您理想中的产品功能',
          type: QuestionType.textarea(),
          options: []
        }
      ];
    }

    // Default general questions
    return [
      {
        text: `请分享您对${topic}的总体看法`,
        type: QuestionType.textarea(),
        options: []
      },
      {
        text: `您对${topic}的满意度如何？`,
        type: QuestionType.scale(),
        options: ['非常不满意', '非常满意']
      },
      {
        text: `关于${topic}，您最关心的是什么？`,
        type: QuestionType.singleChoice(),
        options: ['质量', '价格', '服务', '创新性', '可靠性']
      },
      {
        text: `您希望在${topic}方面看到哪些改进？`,
        type: QuestionType.multipleChoice(),
        options: ['更好的性能', '更低的成本', '更简单的操作', '更多的功能', '更好的支持']
      },
      {
        text: `您的邮箱地址（用于后续跟进）`,
        type: QuestionType.email(),
        options: []
      }
    ];
  }

  // Statistics for demo purposes
  getGenerationStats() {
    return {
      totalGenerations: this.generationCount,
      avgResponseTime: 1500,
      successRate: 1.0
    };
  }
} 