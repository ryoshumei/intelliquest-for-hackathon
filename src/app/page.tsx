'use client';

import { useState } from 'react';

export default function Home() {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
    data?: Record<string, unknown> | null;
  }>({
    status: 'idle',
    message: '测试结果将显示在这里...'
  });

  const testCreateSurvey = async () => {
    setTestResult({ status: 'loading', message: '正在测试创建问卷...' });
    
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '测试问卷 - 六角架构验证',
          description: '这是一个用来验证六角架构实现的测试问卷',
          userId: 'test-user-123',
          useAI: false,
          questions: [
            {
              text: '您对六角架构的理解如何？',
              type: 'single_choice',
              options: ['完全理解', '基本理解', '不太理解', '完全不理解'],
              isRequired: true
            }
          ]
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setTestResult({
          status: 'success',
          message: '✅ 创建成功！',
          data: result
        });
      } else {
        setTestResult({
          status: 'error',
          message: `❌ 创建失败: ${result.error || '未知错误'}`
        });
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `❌ 创建失败: ${error instanceof Error ? error.message : '网络错误'}`
      });
    }
  };

  const testCreateSurveyWithAI = async () => {
    setTestResult({ status: 'loading', message: '正在测试 AI 问题生成...' });
    
    try {
      const response = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'AI 生成问卷测试',
          description: '测试 Vertex AI 问题生成功能',
          userId: 'test-user-ai-123',
          useAI: true,
          aiGenerationParams: {
            topic: '用户体验',
            questionCount: 3,
            targetAudience: '产品用户',
            surveyGoal: '收集用户反馈'
          }
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setTestResult({
          status: 'success',
          message: `✅ AI 生成成功！生成了 ${result.questionCount || 0} 个问题`,
          data: result
        });
      } else {
        setTestResult({
          status: 'error',
          message: `❌ AI 生成失败: ${result.error || '未知错误'}`
        });
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `❌ AI 生成失败: ${error instanceof Error ? error.message : '网络错误'}`
      });
    }
  };

  const testGetSurveys = async () => {
    setTestResult({ status: 'loading', message: '正在获取问卷列表...' });
    
    try {
      const response = await fetch('/api/surveys');
      const result = await response.json();
      
      if (response.ok) {
        const surveyCount = result.surveys ? result.surveys.length : 0;
        setTestResult({
          status: 'success',
          message: `✅ 获取成功！找到 ${surveyCount} 个问卷`,
          data: result
        });
      } else {
        setTestResult({
          status: 'error',
          message: `❌ 获取失败: ${result.error || '未知错误'}`
        });
      }
    } catch (error) {
      setTestResult({
        status: 'error',
        message: `❌ 获取失败: ${error instanceof Error ? error.message : '网络错误'}`
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🧠 IntelliQuest
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            AI-Powered Survey Creation Platform
          </p>
          <p className="text-sm text-gray-500">
            Built with Hexagonal Architecture + Domain-Driven Design
          </p>
        </div>

        {/* Architecture Overview */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🏛️ 六角架构 (Hexagonal Architecture) 实现
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">🎯 Domain Layer</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Survey Entity (业务规则)</li>
                  <li>• Question Entity (问题类型)</li>
                  <li>• Value Objects (ID, Type)</li>
                  <li>• Domain Events (事件)</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🔌 Application Layer</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• CreateSurveyUseCase</li>
                  <li>• AI Question Generator</li>
                  <li>• Event Bus Service</li>
                  <li>• Request/Response DTOs</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-2">🔧 Infrastructure Layer</h3>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• MockSurveyRepository</li>
                  <li>• MockAI Service</li>
                  <li>• Event Bus Adapter</li>
                  <li>• External API Clients</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-semibold text-orange-800 mb-2">🖥️ Interface Layer</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• NextJS API Routes</li>
                  <li>• React Components</li>
                  <li>• REST API Endpoints</li>
                  <li>• User Interface</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Showcase */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🤖 AI 问题生成
            </h3>
            <p className="text-gray-600 mb-4">
              使用 AI 智能生成问卷问题，支持多种题型和自定义主题。
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div>• 智能模型驱动</div>
              <div>• 10+ 种问题类型</div>
              <div>• 中英文双语支持</div>
              <div>• 智能问题优化</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              🔄 混合交互模式
            </h3>
            <p className="text-gray-600 mb-4">
              结合 AI 生成和人工编辑，创造最佳的问卷体验。
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <div>• AI + Human 协作</div>
              <div>• 实时问题预览</div>
              <div>• 智能问题推荐</div>
              <div>• 自适应问题流程</div>
            </div>
          </div>
        </div>

        {/* API Testing */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🧪 API 测试区域
          </h2>
          
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">测试六角架构 API</h3>
              <p className="text-sm text-gray-600 mb-4">
                点击下面的按钮测试我们的六角架构实现：
              </p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={testCreateSurvey}
                  disabled={testResult.status === 'loading'}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {testResult.status === 'loading' ? '测试中...' : '测试创建问卷'}
                </button>
                
                <button
                  onClick={testCreateSurveyWithAI}
                  disabled={testResult.status === 'loading'}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {testResult.status === 'loading' ? '测试中...' : '测试 AI 生成'}
                </button>
                
                <button
                  onClick={testGetSurveys}
                  disabled={testResult.status === 'loading'}
                  className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {testResult.status === 'loading' ? '测试中...' : '获取问卷列表'}
                </button>
              </div>
            </div>
            
            {/* Test Results Display */}
            <div className="bg-gray-50 p-4 rounded-lg min-h-[100px]">
              <div className={`
                ${testResult.status === 'loading' ? 'text-blue-600' : ''}
                ${testResult.status === 'success' ? 'text-green-600' : ''}
                ${testResult.status === 'error' ? 'text-red-600' : ''}
                ${testResult.status === 'idle' ? 'text-gray-500' : ''}
              `}>
                {testResult.status === 'loading' && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>{testResult.message}</span>
                  </div>
                )}
                
                {testResult.status !== 'loading' && (
                  <p className="font-medium mb-2">{testResult.message}</p>
                )}
                
                {testResult.data && (
                  <div className="mt-3">
                    <details className="cursor-pointer">
                      <summary className="text-sm text-gray-600 hover:text-gray-800 select-none">
                        点击查看详细响应数据 ▼
                      </summary>
                      <pre className="text-xs bg-white p-3 mt-2 rounded border overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(testResult.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Development Roadmap */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            🗺️ 开发路线图
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </div>
              <span className="text-green-700 font-medium">Day 1-2: 六角架构基础搭建 (已完成)</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">🔄</span>
              </div>
              <span className="text-yellow-700 font-medium">Day 3-4: Firebase 集成 + AI 服务 (进行中)</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">3</span>
              </div>
              <span className="text-gray-600">Day 5-6: 前端界面 + 实时功能</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs font-bold">4</span>
              </div>
              <span className="text-gray-600">Day 7: 部署上线 + 演示准备</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
