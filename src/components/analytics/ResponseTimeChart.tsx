'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ResponseTimeChartProps {
  data: { date: string; responses: number }[];
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Trends</CardTitle>
          <CardDescription>Daily response activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="text-sm">No response data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxResponses = Math.max(...data.map(d => d.responses));
  const totalResponses = data.reduce((sum, d) => sum + d.responses, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Trends</CardTitle>
        <CardDescription>
          Daily response activity • {totalResponses} total responses over {data.length} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Simple Bar Chart */}
          <div className="space-y-3">
            {data.map((item, index) => {
              const percentage = maxResponses > 0 ? (item.responses / maxResponses) * 100 : 0;
              const date = new Date(item.date);
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        weekday: 'short'
                      })}
                    </span>
                    <span className="text-gray-500">
                      {item.responses} response{item.responses !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Statistics */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-600">{totalResponses}</div>
                <div className="text-xs text-blue-700">Total Responses</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-green-600">
                  {(totalResponses / data.length).toFixed(1)}
                </div>
                <div className="text-xs text-green-700">Avg per Day</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-600">{maxResponses}</div>
                <div className="text-xs text-purple-700">Peak Day</div>
              </div>
            </div>
          </div>

          {/* Activity Insights */}
          {data.length > 1 && (
            <div className="border-t pt-4">
              <div className="text-sm font-medium text-gray-800 mb-2">Activity Insights</div>
              <div className="space-y-1 text-sm text-gray-600">
                {(() => {
                  const recentDays = data.slice(-3);
                  const earlierDays = data.slice(0, -3);
                  const recentAvg = recentDays.reduce((sum, d) => sum + d.responses, 0) / recentDays.length;
                  const earlierAvg = earlierDays.length > 0 ? earlierDays.reduce((sum, d) => sum + d.responses, 0) / earlierDays.length : recentAvg;
                  
                  if (recentAvg > earlierAvg * 1.2) {
                    return (
                      <div className="flex items-center gap-2 text-green-700 bg-green-50 p-2 rounded">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        Response activity is trending upward in recent days
                      </div>
                    );
                  } else if (recentAvg < earlierAvg * 0.8) {
                    return (
                      <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-2 rounded">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Response activity has decreased in recent days
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-2 text-blue-700 bg-blue-50 p-2 rounded">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Response activity is steady and consistent
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 