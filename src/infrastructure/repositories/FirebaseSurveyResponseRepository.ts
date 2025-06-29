/**
 * Firebase Survey Response Repository
 * Handles persistence of survey responses in Firestore
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SurveyResponse, SurveyResponseData } from '../../domain/survey/entities/SurveyResponse';
import { SurveyResponseRepository } from '../../application/use-cases/SubmitSurveyResponseUseCase';

export class FirebaseSurveyResponseRepository implements SurveyResponseRepository {
  private readonly collectionName = 'survey_responses';

  /**
   * Remove undefined values from an object recursively
   * Firestore doesn't support undefined values
   */
  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = this.removeUndefinedValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  async save(response: SurveyResponse): Promise<void> {
    try {
      const responseData = response.toData();
      
      // Convert dates to Firestore timestamps
      const firestoreData = {
        ...responseData,
        startedAt: Timestamp.fromDate(responseData.startedAt),
        submittedAt: responseData.submittedAt 
          ? Timestamp.fromDate(responseData.submittedAt)
          : null,
        responses: responseData.responses.map(r => ({
          ...r,
          answeredAt: Timestamp.fromDate(r.answeredAt)
        }))
      };

      // Remove undefined values to ensure Firestore compatibility
      const cleanedData = this.removeUndefinedValues(firestoreData);

      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const docRef = doc(db, this.collectionName, responseData.id);
      await setDoc(docRef, cleanedData);
      
      console.log(`✅ Survey response saved: ${responseData.id}`);
    } catch (error) {
      console.error('❌ Error saving survey response:', error);
      throw new Error(`Failed to save survey response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<SurveyResponse | null> {
    try {
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return this.convertToSurveyResponse(data);
    } catch (error) {
      console.error('❌ Error finding survey response by ID:', error);
      throw new Error(`Failed to find survey response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySurveyId(surveyId: string): Promise<SurveyResponse[]> {
    try {
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const q = query(
        collection(db, this.collectionName),
        where('surveyId', '==', surveyId),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const responses: SurveyResponse[] = [];
      
      querySnapshot.forEach((doc) => {
        const response = this.convertToSurveyResponse(doc.data());
        if (response) {
          responses.push(response);
        }
      });
      
      return responses;
    } catch (error) {
      console.error('❌ Error finding survey responses by survey ID:', error);
      throw new Error(`Failed to find survey responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByRespondentId(respondentId: string): Promise<SurveyResponse[]> {
    try {
      if (!db) {
        throw new Error('Firestore database not initialized');
      }
      const q = query(
        collection(db, this.collectionName),
        where('respondentId', '==', respondentId),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const responses: SurveyResponse[] = [];
      
      querySnapshot.forEach((doc) => {
        const response = this.convertToSurveyResponse(doc.data());
        if (response) {
          responses.push(response);
        }
      });
      
      return responses;
    } catch (error) {
      console.error('❌ Error finding survey responses by respondent ID:', error);
      throw new Error(`Failed to find survey responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToSurveyResponse(data: any): SurveyResponse | null {
    try {
      // Helper function to safely convert timestamps
      const convertTimestamp = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp?.toDate) return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        if (typeof timestamp === 'string' || typeof timestamp === 'number') {
          const date = new Date(timestamp);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      };

      // Convert Firestore timestamps back to dates
      const responseData: SurveyResponseData = {
        id: data.id,
        surveyId: data.surveyId,
        respondentId: data.respondentId,
        respondentEmail: data.respondentEmail,
        responses: data.responses?.map((r: any) => ({
          ...r,
          answeredAt: convertTimestamp(r.answeredAt) || new Date()
        })) || [],
        startedAt: convertTimestamp(data.startedAt) || new Date(),
        submittedAt: convertTimestamp(data.submittedAt) || undefined,
        isComplete: data.isComplete || false,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata
      };

      return SurveyResponse.fromData(responseData);
    } catch (error) {
      console.error('❌ Error converting Firestore data to SurveyResponse:', error);
      return null;
    }
  }
} 