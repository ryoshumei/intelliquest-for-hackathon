import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
  FirestoreError,
  DocumentSnapshot,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/infrastructure/firebase/config';
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
 * Firestore document interface for Survey persistence
 * Phase 3: Enhanced with new fields
 */
interface SurveyDocument {
  title: string;
  description: string;
  goal?: string; // Phase 3: Survey goal
  ownerId: string;
  questions: QuestionDocument[];
  dynamicQuestions?: QuestionDocument[]; // Phase 3: AI-generated questions
  maxQuestions?: number; // Phase 3: Maximum question limit
  targetLanguage?: string; // Phase 3: Target language
  autoTranslate?: boolean; // Phase 3: Auto-translate flag
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Firestore document interface for Question persistence  
 */
interface QuestionDocument {
  id: string;
  text: string;
  type: string;
  options?: string[];
  isRequired: boolean;
  isAIGenerated: boolean;
  order: number;
  createdAt: Timestamp;
}

/**
 * Firebase Survey Repository Implementation
 * Provides real Firestore persistence with user data isolation
 */
export class FirebaseSurveyRepository implements SurveyRepository {
  private readonly collectionName = 'surveys';

  constructor(private readonly currentUserId?: string) {}

  async save(survey: Survey): Promise<Survey> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const surveysCollection = collection(db, this.collectionName);
      
      const surveyDoc = this.surveyToDocument(survey);
      
      // Check if survey already exists (update) or is new (create)
      const existingSurvey = await this.findByIdString(survey.getId());
      
      if (existingSurvey) {
        // Update existing survey
        const docRef = doc(db, this.collectionName, survey.getId());
        await updateDoc(docRef, {
          ...surveyDoc,
          updatedAt: Timestamp.now()
        });
             } else {
         // Create new survey with custom ID
         const docRef = doc(db, this.collectionName, survey.getId());
         await setDoc(docRef, surveyDoc);
       }
      
      console.log(`FirebaseSurveyRepository: Saved survey ${survey.getId()}`);
      return survey;
      
    } catch (error) {
      console.error('Error saving survey:', error);
      throw this.handleFirestoreError(error);
    }
  }

  async findById(id: SurveyId): Promise<Survey | null> {
    return this.findByIdString(id.getValue());
  }

  async findByIdString(id: string): Promise<Survey | null> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      const surveyDoc = docSnap.data() as SurveyDocument;
      
      // Check user access - users can only access their own surveys
      if (this.currentUserId && surveyDoc.ownerId !== this.currentUserId) {
        return null; // Return null instead of throwing error for better UX
      }
      
      return this.documentToSurvey(id, surveyDoc);
      
    } catch (error) {
      console.error('Error finding survey by ID:', error);
      throw this.handleFirestoreError(error);
    }
  }

  async findByUserId(userId: string): Promise<Survey[]> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const surveysCollection = collection(db, this.collectionName);
      
      const q = query(
        surveysCollection,
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const surveys: Survey[] = [];
      
      querySnapshot.forEach((doc) => {
        const surveyDoc = doc.data() as SurveyDocument;
        const survey = this.documentToSurvey(doc.id, surveyDoc);
        surveys.push(survey);
      });
      
      return surveys;
      
    } catch (error) {
      console.error('Error finding surveys by user ID:', error);
      throw this.handleFirestoreError(error);
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
      if (!db) throw new Error('Firestore not initialized');
      const surveysCollection = collection(db, this.collectionName);
      
      // Build query with filters (simplified to avoid index requirements)
      let q = query(surveysCollection);
      
      // Apply user filter (most important for security)
      if (filters?.userId) {
        q = query(q, where('ownerId', '==', filters.userId));
      } else if (this.currentUserId) {
        q = query(q, where('ownerId', '==', this.currentUserId));
      }
      
      // For now, skip complex filtering to avoid index requirements
      // In production, you would create proper Firestore indexes
      
      // Add pagination only
      q = query(q, limit(pageLimit));
      
      // Get total count for pagination info
      const totalQuery = query(surveysCollection);
      const totalSnapshot = await getCountFromServer(totalQuery);
      const total = totalSnapshot.data().count;
      
      // Execute paginated query
      const querySnapshot = await getDocs(q);
      const surveys: Survey[] = [];
      
      querySnapshot.forEach((doc) => {
        const surveyDoc = doc.data() as SurveyDocument;
        const survey = this.documentToSurvey(doc.id, surveyDoc);
        surveys.push(survey);
      });
      
      return {
        surveys,
        total,
        hasMore: surveys.length === pageLimit && offset + pageLimit < total
      };
      
    } catch (error) {
      console.error('Error finding surveys with pagination:', error);
      throw this.handleFirestoreError(error);
    }
  }

  async delete(id: SurveyId): Promise<void> {
    try {
      // First check if survey exists and user has permission
      const survey = await this.findById(id);
      if (!survey) {
        throw new Error('Survey not found or access denied');
      }
      
      if (!db) throw new Error('Firestore not initialized');
      const docRef = doc(db, this.collectionName, id.getValue());
      await deleteDoc(docRef);
      
      console.log(`FirebaseSurveyRepository: Deleted survey ${id.getValue()}`);
      
    } catch (error) {
      console.error('Error deleting survey:', error);
      throw this.handleFirestoreError(error);
    }
  }

  async exists(id: SurveyId): Promise<boolean> {
    const survey = await this.findById(id);
    return survey !== null;
  }

  async findByTitle(title: string, userId?: string): Promise<Survey[]> {
    try {
      if (!db) throw new Error('Firestore not initialized');
      const surveysCollection = collection(db, this.collectionName);
      
      // Use the provided userId or current user ID
      const searchUserId = userId || this.currentUserId;
      if (!searchUserId) {
        throw new Error('User ID required for title search');
      }
      
      const q = query(
        surveysCollection,
        where('ownerId', '==', searchUserId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const surveys: Survey[] = [];
      
      // Filter by title in memory (Firestore doesn't support contains queries easily)
      querySnapshot.forEach((doc) => {
        const surveyDoc = doc.data() as SurveyDocument;
        if (surveyDoc.title.toLowerCase().includes(title.toLowerCase())) {
          const survey = this.documentToSurvey(doc.id, surveyDoc);
          surveys.push(survey);
        }
      });
      
      return surveys;
      
    } catch (error) {
      console.error('Error finding surveys by title:', error);
      throw this.handleFirestoreError(error);
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
      throw this.handleFirestoreError(error);
    }
  }

  /**
   * Convert Survey entity to Firestore document
   * Phase 3: Enhanced with new fields
   */
  private surveyToDocument(survey: Survey): SurveyDocument {
    if (!this.currentUserId) {
      throw new Error('User ID required to save survey');
    }
    
    return {
      title: survey.getTitle(),
      description: survey.getDescription(),
      goal: survey.getGoal(),
      ownerId: this.currentUserId,
      questions: survey.getQuestions().map(this.questionToDocument),
      dynamicQuestions: survey.getDynamicQuestions().map(this.questionToDocument),
      maxQuestions: survey.getMaxQuestions(),
      targetLanguage: survey.getTargetLanguage(),
      autoTranslate: survey.getAutoTranslate(),
      isActive: survey.getIsActive(),
      createdAt: Timestamp.fromDate(survey.getCreatedAt()),
      updatedAt: Timestamp.fromDate(survey.getUpdatedAt())
    };
  }

  /**
   * Convert Firestore document to Survey entity
   * Phase 3: Enhanced with new fields
   */
  private documentToSurvey(id: string, doc: SurveyDocument): Survey {
    const questions = doc.questions.map(this.documentToQuestion);
    const dynamicQuestions = (doc.dynamicQuestions || []).map(this.documentToQuestion);
    
    return Survey.fromPersistence(
      id,
      doc.title,
      doc.description || '',
      doc.goal || '', // Phase 3: Survey goal
      questions,
      dynamicQuestions, // Phase 3: Dynamic questions
      doc.maxQuestions || 10, // Phase 3: Max questions limit
      doc.targetLanguage || 'en', // Phase 3: Target language
      doc.autoTranslate || false, // Phase 3: Auto-translate flag
      doc.isActive,
      doc.createdAt.toDate(),
      doc.updatedAt.toDate()
    );
  }

  /**
   * Convert Question entity to Firestore document
   */
  private questionToDocument(question: Question): QuestionDocument {
    return {
      id: question.getId(),
      text: question.getText(),
      type: question.getType().getValue(),
      options: question.getOptions(),
      isRequired: question.getIsRequired(),
      isAIGenerated: question.getIsAIGenerated(),
      order: question.getOrder(),
      createdAt: Timestamp.fromDate(question.getCreatedAt())
    };
  }

  /**
   * Convert Firestore document to Question entity
   */
  private documentToQuestion(doc: QuestionDocument): Question {
    return Question.fromPersistence(
      doc.id,
      doc.text,
      QuestionType.fromString(doc.type),
      doc.options || [],
      doc.isRequired,
      doc.isAIGenerated,
      doc.order,
      doc.createdAt.toDate()
    );
  }

  /**
   * Handle Firestore errors and convert to domain errors
   */
  private handleFirestoreError(error: unknown): Error {
    if (error instanceof FirestoreError) {
      switch (error.code) {
        case 'permission-denied':
          return new Error('Access denied: insufficient permissions');
        case 'not-found':
          return new Error('Survey not found');
        case 'unavailable':
          return new Error('Database temporarily unavailable');
        case 'resource-exhausted':
          return new Error('Database quota exceeded');
        default:
          return new Error(`Database error: ${error.message}`);
      }
    }
    
    if (error instanceof Error) {
      return error;
    }
    
    return new Error('Unknown database error occurred');
  }
} 