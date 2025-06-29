'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuestionAnalytics } from '@/application/services/AnalyticsService';

interface QuestionAnalyticsCardProps {
  analytics: QuestionAnalytics;
}

export function QuestionAnalyticsCard({ analytics }: QuestionAnalyticsCardProps) {
  const renderDistributionChart = () => {
    if (analytics.questionType === 'multiple_choice') {
      const entries = Object.entries(analytics.responseDistribution);
      const total = entries.reduce((sum, [, count]) => sum + (Number(count) || 0), 0);

      return (
        <div className="space-y-3">
          {entries.map(([option, count]) => {
            const numCount = Number(count) || 0;
            const percentage = total > 0 ? (numCount / total) * 100 : 0;
            
            return (
              <div key={option} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate max-w-[200px]">{option}</span>
                    <span className="text-gray-600">{numCount} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if (analytics.questionType === 'rating') {
      const entries = Object.entries(analytics.responseDistribution);
      const total = entries.reduce((sum, [, count]) => sum + (Number(count) || 0), 0);

      return (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2 mb-4">
            {Array.from({ length: 10 }, (_, i) => {
              const rating = i + 1;
              const count = Number(analytics.responseDistribution[rating] || 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={rating} className="text-center">
                  <div className="text-xs font-medium text-gray-600 mb-1">{rating}</div>
                  <div className="h-16 bg-gray-100 rounded flex items-end justify-center">
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm w-full transition-all duration-300"
                      style={{ height: `${Math.max(percentage, 5)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{count}</div>
                </div>
              );
            }).slice(0, 10)}
          </div>
          {analytics.averageRating && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Average Rating</div>
              <div className="text-2xl font-bold text-blue-600">{analytics.averageRating.toFixed(1)}</div>
            </div>
          )}
        </div>
      );
    }

    if (analytics.questionType === 'boolean') {
      const yesCount = Number(analytics.responseDistribution['Yes'] || 0);
      const noCount = Number(analytics.responseDistribution['No'] || 0);
      const total = yesCount + noCount;

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{yesCount}</div>
              <div className="text-sm text-green-700">Yes</div>
              <div className="text-xs text-green-600">
                {total > 0 ? `${((yesCount / total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{noCount}</div>
              <div className="text-sm text-red-700">No</div>
              <div className="text-xs text-red-600">
                {total > 0 ? `${((noCount / total) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (analytics.questionType === 'text') {
      return (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Sample Responses:</div>
          {analytics.textResponseSummary && analytics.textResponseSummary.length > 0 ? (
            <div className="space-y-2">
              {analytics.textResponseSummary.slice(0, 5).map((response, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                  <div className="text-sm text-gray-700 italic">"{response}"</div>
                </div>
              ))}
              {analytics.textResponseSummary.length > 5 && (
                <div className="text-xs text-gray-500 text-center">
                  And {analytics.textResponseSummary.length - 5} more responses...
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">No text responses yet.</div>
          )}
        </div>
      );
    }

    return <div className="text-sm text-gray-500">No data available for visualization.</div>;
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'rating': return 'bg-purple-100 text-purple-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'boolean': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'rating':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'text':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'boolean':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{analytics.questionText}</CardTitle>
            <CardDescription className="mt-1">
              {analytics.totalResponses} response{analytics.totalResponses !== 1 ? 's' : ''} collected
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge className={getQuestionTypeColor(analytics.questionType)}>
              <div className="flex items-center gap-1">
                {getQuestionTypeIcon(analytics.questionType)}
                {analytics.questionType.replace('_', ' ')}
              </div>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {analytics.totalResponses > 0 ? (
          <>
            {renderDistributionChart()}
            
            {/* Additional insights for specific question types */}
            {analytics.mostCommonAnswer && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">Most Popular Answer</div>
                <div className="text-blue-700">"{analytics.mostCommonAnswer}"</div>
              </div>
            )}

            {analytics.questionType === 'text' && analytics.totalResponses > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm font-medium text-green-800">Response Analysis</div>
                <div className="text-sm text-green-700">
                  Collected {analytics.totalResponses} text response{analytics.totalResponses !== 1 ? 's' : ''}
                  {analytics.textResponseSummary && (
                    <span> • Average length: ~{Math.round(analytics.textResponseSummary.reduce((sum, text) => sum + text.length, 0) / analytics.textResponseSummary.length)} characters</span>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <div className="text-sm">No responses yet for this question</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 