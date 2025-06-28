import { adminFirestore } from '@/lib/firebase-admin';
import { Survey } from '@/domain/survey/entities/Survey';
import { SurveyId } from '@/domain/survey/value-objects/SurveyId';
import { Question } from '@/domain/survey/entities/Question';
import { QuestionType } from '@/domain/survey/value-objects/QuestionType';
import { QuestionId } from '@/domain/survey/value-objects/QuestionId';
import {
  SurveyRepository,
  SurveyFilters,
  SurveyStatistics
} from '@/domain/survey/repositories/SurveyRepository';

/**
 * Admin Firebase Survey Repository Implementation
 * Uses Firebase Admin SDK for server-side operations, bypassing security rules
 */
export class AdminFirebaseSurveyRepository implements SurveyRepository {
  private readonly collectionName = 'surveys';

  constructor(private readonly currentUserId?: string) {}

  async save(survey: Survey): Promise<Survey> {
    try {
      const surveyDoc = this.surveyToDocument(survey);
      
      // Check if survey already exists (update) or is new (create)
      const existingSurvey = await this.findByIdString(survey.getId());
      
      if (existingSurvey) {
        // Update existing survey
        await adminFirestore
          .collection(this.collectionName)
          .doc(survey.getId())
          .update({
            ...surveyDoc,
            updatedAt: new Date()
          });
      } else {
        // Create new survey with custom ID
        await adminFirestore
          .collection(this.collectionName)
          .doc(survey.getId())
          .set(surveyDoc);
      }
      
      console.log(`AdminFirebaseSurveyRepository: Saved survey ${survey.getId()}`);
      return survey;
      
    } catch (error) {
      console.error('Error saving survey:', error);
      throw new Error(`Failed to save survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: SurveyId): Promise<Survey | null> {
    return this.findByIdString(id.getValue());
  }

  async findByIdString(id: string): Promise<Survey | null> {
    try {
      const docRef = adminFirestore.collection(this.collectionName).doc(id);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        return null;
      }
      
      const surveyDoc = docSnap.data();
      if (!surveyDoc) {
        return null;
      }
      
      // Check user access - users can only access their own surveys
      if (this.currentUserId && surveyDoc.ownerId !== this.currentUserId) {
        return null; // Return null instead of throwing error for better UX
      }
      
      return this.documentToSurvey(id, surveyDoc);
      
    } catch (error) {
      console.error('Error finding survey by ID:', error);
      throw new Error(`Failed to find survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string): Promise<Survey[]> {
    try {
      const querySnapshot = await adminFirestore
        .collection(this.collectionName)
        .where('ownerId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const surveys: Survey[] = [];
      
      querySnapshot.forEach((doc: any) => {
        const surveyDoc = doc.data();
        const survey = this.documentToSurvey(doc.id, surveyDoc);
        surveys.push(survey);
      });
      
      return surveys;
      
    } catch (error) {
      console.error('Error finding surveys by user ID:', error);
      throw new Error(`Failed to find surveys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findWithPagination(
    offset: number,
    pageLimit: number,
    filters?: SurveyFilters
  ): Promise<{
    surveys: Survey[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query: any = adminFirestore.collection(this.collectionName);
      
      // Apply user filter (most important for security)
      if (filters?.userId) {
        query = query.where('ownerId', '==', filters.userId);
      } else if (this.currentUserId) {
        query = query.where('ownerId', '==', this.currentUserId);
      }
      
      // Add ordering and limit
      query = query.orderBy('createdAt', 'desc').limit(pageLimit);
      
      // Execute query
      const querySnapshot = await query.get();
      const surveys: Survey[] = [];
      
      querySnapshot.forEach((doc: any) => {
        const surveyDoc = doc.data();
        const survey = this.documentToSurvey(doc.id, surveyDoc);
        surveys.push(survey);
      });
      
      // Get total count for pagination info
      const totalQuery = adminFirestore.collection(this.collectionName);
      const totalSnapshot = await (filters?.userId 
        ? totalQuery.where('ownerId', '==', filters.userId).get()
        : this.currentUserId 
        ? totalQuery.where('ownerId', '==', this.currentUserId).get()
        : totalQuery.get());
      
      const total = totalSnapshot.size;
      
      return {
        surveys,
        total,
        hasMore: surveys.length === pageLimit && offset + pageLimit < total
      };
      
    } catch (error) {
      console.error('Error finding surveys with pagination:', error);
      throw new Error(`Failed to find surveys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: SurveyId): Promise<void> {
    try {
      // First check if survey exists and user has permission
      const survey = await this.findById(id);
      if (!survey) {
        throw new Error('Survey not found or access denied');
      }
      
      await adminFirestore.collection(this.collectionName).doc(id.getValue()).delete();
      
      console.log(`AdminFirebaseSurveyRepository: Deleted survey ${id.getValue()}`);
      
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw new Error(`Failed to delete survey: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(id: SurveyId): Promise<boolean> {
    const survey = await this.findById(id);
    return survey !== null;
  }

  async findByTitle(title: string, userId?: string): Promise<Survey[]> {
    try {
      // Use the provided userId or current user ID
      const searchUserId = userId || this.currentUserId;
      if (!searchUserId) {
        throw new Error('User ID required for title search');
      }
      
      const querySnapshot = await adminFirestore
        .collection(this.collectionName)
        .where('ownerId', '==', searchUserId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const surveys: Survey[] = [];
      
      // Filter by title in memory (Firestore doesn't support contains queries easily)
      querySnapshot.forEach((doc: any) => {
        const surveyDoc = doc.data();
        if (surveyDoc.title.toLowerCase().includes(title.toLowerCase())) {
          const survey = this.documentToSurvey(doc.id, surveyDoc);
          surveys.push(survey);
        }
      });
      
      return surveys;
      
    } catch (error) {
      console.error('Error finding surveys by title:', error);
      throw new Error(`Failed to find surveys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getStatistics(userId?: string): Promise<SurveyStatistics> {
    try {
      const searchUserId = userId || this.currentUserId;
      if (!searchUserId) {
        throw new Error('User ID required for statistics');
      }
      
      const surveys = await this.findByUserId(searchUserId);
      
      const activeSurveys = surveys.filter(s => s.getIsActive());
      const totalQuestions = surveys.reduce(
        (sum, survey) => sum + survey.getQuestionCount(),
        0
      );
      
      const aiGeneratedQuestions = surveys.reduce(
        (sum, survey) => {
          const aiQuestions = survey.getQuestions().filter(q => q.getIsAIGenerated());
          return sum + aiQuestions.length;
        },
        0
      );
      
      return {
        totalSurveys: surveys.length,
        activeSurveys: activeSurveys.length,
        totalQuestions,
        aiGeneratedQuestions,
        averageQuestionsPerSurvey: surveys.length > 0
          ? totalQuestions / surveys.length
          : 0
      };
      
    } catch (error) {
      console.error('Error getting survey statistics:', error);
      throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Survey entity to Firestore document
   */
  private surveyToDocument(survey: Survey): any {
    if (!this.currentUserId) {
      throw new Error('User ID required to save survey');
    }
    
    return {
      title: survey.getTitle(),
      description: survey.getDescription(),
      ownerId: this.currentUserId,
      questions: survey.getQuestions().map(this.questionToDocument),
      isActive: survey.getIsActive(),
      createdAt: survey.getCreatedAt(),
      updatedAt: survey.getUpdatedAt()
    };
  }

  /**
   * Convert Firestore document to Survey entity
   */
  private documentToSurvey(id: string, doc: any): Survey {
    const questions = (doc.questions || []).map(this.documentToQuestion);
    
    return Survey.fromPersistence(
      id,
      doc.title,
      doc.description,
      questions,
      doc.isActive,
      doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt),
      doc.updatedAt?.toDate ? doc.updatedAt.toDate() : new Date(doc.updatedAt)
    );
  }

  /**
   * Convert Question entity to Firestore document
   */
  private questionToDocument(question: Question): any {
    return {
      id: question.getId(),
      text: question.getText(),
      type: question.getType().getValue(),
      options: question.getOptions(),
      isRequired: question.getIsRequired(),
      isAIGenerated: question.getIsAIGenerated(),
      order: question.getOrder(),
      createdAt: question.getCreatedAt()
    };
  }

  /**
   * Convert Firestore document to Question entity
   */
  private documentToQuestion(doc: any): Question {
    return Question.fromPersistence(
      doc.id,
      doc.text,
      QuestionType.fromString(doc.type),
      doc.options || [],
      doc.isRequired,
      doc.isAIGenerated,
      doc.order,
      doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt)
    );
  }
} 