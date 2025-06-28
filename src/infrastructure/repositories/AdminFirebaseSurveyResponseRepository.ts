import { adminFirestore } from '@/lib/firebase-admin';
import { SurveyResponse, SurveyResponseData } from '../../domain/survey/entities/SurveyResponse';
import { SurveyResponseRepository } from '../../application/use-cases/SubmitSurveyResponseUseCase';

export class AdminFirebaseSurveyResponseRepository implements SurveyResponseRepository {
  private readonly collectionName = 'survey_responses';

  async save(response: SurveyResponse): Promise<void> {
    try {
      const responseData = response.toData();
      
      // Convert dates for Firestore
      const firestoreData = {
        ...responseData,
        startedAt: responseData.startedAt,
        submittedAt: responseData.submittedAt || null,
        responses: responseData.responses.map(r => ({
          ...r,
          answeredAt: r.answeredAt
        }))
      };

      // Remove undefined values to ensure Firestore compatibility
      const cleanedData = this.removeUndefinedValues(firestoreData);

      await adminFirestore
        .collection(this.collectionName)
        .doc(responseData.id)
        .set(cleanedData);
      
      console.log(`✅ Admin Survey response saved: ${responseData.id}`);
    } catch (error) {
      console.error('❌ Error saving survey response:', error);
      throw new Error(`Failed to save survey response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<SurveyResponse | null> {
    try {
      const docRef = adminFirestore.collection(this.collectionName).doc(id);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
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
      const querySnapshot = await adminFirestore
        .collection(this.collectionName)
        .where('surveyId', '==', surveyId)
        .get();
      
      const responses: SurveyResponse[] = [];
      
      querySnapshot.forEach((doc) => {
        const response = this.convertToSurveyResponse(doc.data());
        if (response) {
          responses.push(response);
        }
      });
      
      // Sort in memory by submittedAt (newest first)
      responses.sort((a, b) => {
        const aDate = a.getSubmittedAt();
        const bDate = b.getSubmittedAt();
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.getTime() - aDate.getTime();
      });
      
      return responses;
    } catch (error) {
      console.error('❌ Error finding survey responses by survey ID:', error);
      throw new Error(`Failed to find survey responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByRespondentId(respondentId: string): Promise<SurveyResponse[]> {
    try {
      const querySnapshot = await adminFirestore
        .collection(this.collectionName)
        .where('respondentId', '==', respondentId)
        .get();
      
      const responses: SurveyResponse[] = [];
      
      querySnapshot.forEach((doc) => {
        const response = this.convertToSurveyResponse(doc.data());
        if (response) {
          responses.push(response);
        }
      });
      
      // Sort in memory by submittedAt (newest first)
      responses.sort((a, b) => {
        const aDate = a.getSubmittedAt();
        const bDate = b.getSubmittedAt();
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return bDate.getTime() - aDate.getTime();
      });
      
      return responses;
    } catch (error) {
      console.error('❌ Error finding survey responses by respondent ID:', error);
      throw new Error(`Failed to find survey responses: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

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

  private convertToSurveyResponse(data: any): SurveyResponse | null {
    try {
      // Convert Firestore timestamps back to dates
      const responseData: SurveyResponseData = {
        id: data.id,
        surveyId: data.surveyId,
        respondentId: data.respondentId,
        respondentEmail: data.respondentEmail,
        responses: data.responses?.map((r: any) => ({
          ...r,
          answeredAt: r.answeredAt?.toDate ? r.answeredAt.toDate() : new Date(r.answeredAt)
        })) || [],
        startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : new Date(data.startedAt),
        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : null,
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