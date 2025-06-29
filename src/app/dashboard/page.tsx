'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { AuthGuard } from '../components/AuthGuard';

interface SurveyStats {
  totalSurveys: number;
  activeSurveys: number;
  totalResponses: number;
  recentActivity: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  responseCount?: number;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId?: string;
  respondentEmail?: string;
  responses: {
    questionId: string;
    questionText: string;
    questionType: string;
    answer: string | string[] | number;
    answeredAt: string;
  }[];
  startedAt: string;
  submittedAt?: string;
  isComplete: boolean;
  responseCount: number;
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const { user, logout, getToken } = useAuth();
  const [stats, setStats] = useState<SurveyStats>({
    totalSurveys: 0,
    activeSurveys: 0,
    totalResponses: 0,
    recentActivity: 'No recent activity',
  });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [selectedSurveyResponses, setSelectedSurveyResponses] = useState<SurveyResponse[]>([]);
  const [selectedSurveyTitle, setSelectedSurveyTitle] = useState<string>('');
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Fetch real data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.warn('No authentication token available');
          setIsLoading(false);
          return;
        }

        // Fetch surveys data
        const response = await fetch('/api/surveys', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSurveys(data.surveys || []);
          
          // Calculate stats from surveys data
          const totalSurveys = data.surveys?.length || 0;
          const activeSurveys = data.surveys?.filter((s: Survey) => s.isActive)?.length || 0;
          const totalResponses = data.surveys?.reduce((sum: number, s: Survey) => sum + (s.responseCount || 0), 0) || 0;
          const recentActivity = totalSurveys > 0 ? 'Recently active' : 'No recent activity';

          setStats({
            totalSurveys,
            activeSurveys,
            totalResponses,
            recentActivity,
          });
        } else if (response.status === 401) {
          // Token expired or invalid, redirect to login
          console.warn('🚨 Authentication failed, redirecting to login');
          window.location.href = '/auth/login';
          return;
        } else {
          console.error('Failed to fetch surveys:', response.status);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [getToken]);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const copyShareLink = async (surveyId: string) => {
    try {
      const shareUrl = `${window.location.origin}/survey/${surveyId}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(surveyId);
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = `${window.location.origin}/survey/${surveyId}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(surveyId);
      
      setTimeout(() => {
        setCopySuccess(null);
      }, 2000);
    }
  };

  const viewSurveyResponses = async (surveyId: string, surveyTitle: string) => {
    setLoadingResponses(true);
    setSelectedSurveyTitle(surveyTitle);
    setShowResponsesModal(true);

    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`);
      
      if (response.status === 401) {
        // Token expired or invalid, redirect to login
        console.warn('🚨 Authentication failed, redirecting to login');
        window.location.href = '/auth/login';
        return;
      }
      
      const data = await response.json();

      if (data.success) {
        setSelectedSurveyResponses(data.responses || []);
      } else {
        console.error('Failed to fetch responses:', data.message);
        setSelectedSurveyResponses([]);
      }
    } catch (error) {
      console.error('Error fetching survey responses:', error);
      setSelectedSurveyResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const closeResponsesModal = () => {
    setShowResponsesModal(false);
    setSelectedSurveyResponses([]);
    setSelectedSurveyTitle('');
  };

  const formatAnswer = (answer: string | string[] | number) => {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return String(answer);
  };

  if (!user) {
    return null; // AuthGuard should handle this, but just in case
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IQ</span>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">IntelliQuest</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {user.photoURL && (
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user.photoURL}
                    alt={user.displayName}
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user.displayName}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-indigo-500 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Welcome back
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {user.displayName}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <Link
                    href="/create-survey"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Survey
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Surveys */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Surveys
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalSurveys}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Surveys */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Active Surveys
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.activeSurveys}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Responses */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Responses
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.totalResponses}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Last Activity
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.recentActivity}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link
                  href="/create-survey"
                  className="relative block w-full p-6 bg-white border-2 border-gray-300 border-dashed rounded-lg text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-4c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Create New Survey
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    Start building your next survey with AI assistance
                  </span>
                </Link>

                <button
                  onClick={() => alert('Manage Surveys feature coming soon!')}
                  className="relative block w-full p-6 bg-white border border-gray-300 rounded-lg text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Manage Surveys
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    View and edit your existing surveys
                  </span>
                </button>

                <button
                  onClick={() => alert('Analytics feature coming soon!')}
                  className="relative block w-full p-6 bg-white border border-gray-300 rounded-lg text-center hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    View Analytics
                  </span>
                  <span className="mt-1 block text-sm text-gray-500">
                    Analyze survey responses and insights
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Surveys */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  All Surveys ({surveys.length})
                </h3>
              </div>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading surveys...</p>
                </div>
              ) : surveys.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {surveys.map((survey) => (
                    <div key={survey.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{survey.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{survey.description || 'No description'}</p>
                          <div className="flex items-center mt-2 space-x-4 text-xs text-gray-400">
                            <span>{survey.questionCount} questions</span>
                            <span>{survey.responseCount || 0} responses</span>
                            <span>Created {new Date(survey.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            survey.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {survey.isActive ? 'Active' : 'Draft'}
                          </span>
                          {(survey.responseCount || 0) > 0 && (
                            <button
                              onClick={() => viewSurveyResponses(survey.id, survey.title)}
                              className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-blue-700 bg-blue-50 shadow-sm text-xs font-medium rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              title="View responses"
                            >
                              <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Responses
                            </button>
                          )}
                          {survey.isActive && (
                            <button
                              onClick={() => copyShareLink(survey.id)}
                              className={`inline-flex items-center px-3 py-1.5 border shadow-sm text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                                copySuccess === survey.id
                                  ? 'border-green-300 text-green-700 bg-green-50'
                                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                              }`}
                              title="Copy share link"
                            >
                              {copySuccess === survey.id ? (
                                <>
                                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                  </svg>
                                  Share
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating your first survey
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/create-survey"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Survey
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Survey Responses Modal */}
        {showResponsesModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Survey Responses: {selectedSurveyTitle}
                  </h3>
                  <button
                    onClick={closeResponsesModal}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Content */}
                <div className="max-h-96 overflow-y-auto">
                  {loadingResponses ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-500">Loading responses...</p>
                    </div>
                  ) : selectedSurveyResponses.length > 0 ? (
                    <div className="space-y-6">
                      {selectedSurveyResponses.map((response, responseIndex) => (
                        <div key={response.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-gray-900">
                              Response #{responseIndex + 1}
                            </h4>
                            <div className="text-xs text-gray-500">
                              Submitted: {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : 'In progress'}
                              {response.respondentEmail && (
                                <span className="ml-2">by {response.respondentEmail}</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {response.responses.map((answer, answerIndex) => (
                              <div key={answerIndex} className="bg-white p-3 rounded border">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {answer.questionText}
                                  </div>
                                  {answer.questionId?.startsWith('dynamic-') && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                      AI Generated
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                  <span className="font-medium">Answer:</span> {formatAnswer(answer.answer)}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Type: {answer.questionType} • Answered: {answer.answeredAt ? new Date(answer.answeredAt).toLocaleString() : 'Unknown time'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No responses yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This survey hasn't received any responses yet.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                  <button
                    onClick={closeResponsesModal}
                    className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 