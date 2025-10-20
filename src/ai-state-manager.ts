import ZeroGKVStorageClient, { 
  AIAssistantState, 
  ConversationEntry, 
  LearnedPattern, 
  UserPreferences,
  ContractKnowledgeEntry 
} from './kv-storage-client.js';
import { OGNetworkClient } from './network-client.js';
import KnowledgeIngestionEngine from './knowledge-ingestion.js';

export interface AIAssistantMemory {
  shortTerm: ConversationEntry[];
  longTerm: LearnedPattern[];
  contractMemory: Map<string, ContractKnowledgeEntry>;
  userContext: UserPreferences;
}

export interface LearningInsight {
  pattern: string;
  frequency: number;
  success_rate: number;
  gas_optimization: number;
  recommendation: string;
}

export class AIStateManager {
  private kvStorage: ZeroGKVStorageClient;
  private networkClient: OGNetworkClient;
  private knowledgeEngine: KnowledgeIngestionEngine;
  private currentUserId: string | null = null;
  private memory: AIAssistantMemory;
  private learningEnabled: boolean = true;

  // Learning thresholds and parameters
  private readonly LEARNING_CONFIG = {
    MIN_PATTERN_FREQUENCY: 3,
    MIN_SUCCESS_RATE: 0.7,
    MEMORY_RETENTION_DAYS: 30,
    AUTO_LEARN_THRESHOLD: 0.8,
    MAX_SHORT_TERM_ENTRIES: 50
  };

  constructor(
    kvStorage: ZeroGKVStorageClient,
    networkClient: OGNetworkClient,
    knowledgeEngine: KnowledgeIngestionEngine
  ) {
    this.kvStorage = kvStorage;
    this.networkClient = networkClient;
    this.knowledgeEngine = knowledgeEngine;
    
    // Initialize empty memory
    this.memory = {
      shortTerm: [],
      longTerm: [],
      contractMemory: new Map(),
      userContext: this.getDefaultUserPreferences()
    };
  }

  /**
   * Initialize AI state for a user
   */
  async initializeUser(userId: string): Promise<void> {
    console.log(`🤖 Initializing AI state for user: ${userId}`);
    
    try {
      this.currentUserId = userId;
      
      // Load existing state from KV storage
      const existingState = await this.kvStorage.retrieveAssistantState(userId);
      
      if (existingState) {
        console.log(`📚 Loading existing state for user: ${userId}`);
        this.memory = {
          shortTerm: existingState.conversationHistory.slice(-this.LEARNING_CONFIG.MAX_SHORT_TERM_ENTRIES),
          longTerm: existingState.learnedPatterns,
          contractMemory: new Map(existingState.contractKnowledge.map(ck => [ck.address, ck])),
          userContext: existingState.userPreferences
        };
        
        console.log(`✅ Loaded state: ${this.memory.shortTerm.length} conversations, ${this.memory.longTerm.length} patterns`);
      } else {
        console.log(`🆕 Creating new state for user: ${userId}`);
        await this.createInitialState(userId);
      }

      // Load user preferences
      const preferences = await this.kvStorage.retrieveUserPreferences(userId);
      if (preferences) {
        this.memory.userContext = preferences;
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize user state:', error);
      throw error;
    }
  }

  /**
   * Record a conversation and learn from it
   */
  async recordConversation(
    userInput: string,
    assistantResponse: string,
    actionTaken?: string,
    success: boolean = true,
    gasUsed?: string,
    transactionHash?: string
  ): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user initialized. Call initializeUser() first.');
    }

    try {
      const conversationEntry: ConversationEntry = {
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        userInput,
        assistantResponse,
        actionTaken,
        success,
        gasUsed,
        transactionHash
      };

      // Add to short-term memory
      this.memory.shortTerm.push(conversationEntry);
      
      // Maintain memory size limit
      if (this.memory.shortTerm.length > this.LEARNING_CONFIG.MAX_SHORT_TERM_ENTRIES) {
        this.memory.shortTerm = this.memory.shortTerm.slice(-this.LEARNING_CONFIG.MAX_SHORT_TERM_ENTRIES);
      }

      // Store in KV storage
      await this.kvStorage.storeConversationEntry(this.currentUserId, conversationEntry);

      // Learn from this interaction if learning is enabled
      if (this.learningEnabled && success) {
        await this.learnFromInteraction(conversationEntry);
      }

      console.log(`📝 Recorded conversation: ${conversationEntry.id}`);
      
    } catch (error) {
      console.error('❌ Failed to record conversation:', error);
    }
  }

  /**
   * Learn patterns from user interactions
   */
  private async learnFromInteraction(conversation: ConversationEntry): Promise<void> {
    try {
      const patterns = this.extractPatternsFromConversation(conversation);
      
      for (const pattern of patterns) {
        await this.updateOrCreatePattern(pattern);
      }
      
    } catch (error) {
      console.error('❌ Learning from interaction failed:', error);
    }
  }

  /**
   * Extract learning patterns from conversation
   */
  private extractPatternsFromConversation(conversation: ConversationEntry): Partial<LearnedPattern>[] {
    const patterns: Partial<LearnedPattern>[] = [];
    const input = conversation.userInput.toLowerCase();
    
    // Pattern 1: Deployment patterns
    if (input.includes('deploy') && conversation.success) {
      patterns.push({
        pattern: this.extractDeploymentPattern(conversation),
        category: 'deployment',
        confidence: conversation.gasUsed ? 0.9 : 0.7,
        description: `Successful deployment pattern from: ${conversation.userInput.substring(0, 50)}...`
      });
    }

    // Pattern 2: Gas optimization patterns
    if (conversation.gasUsed && conversation.success) {
      patterns.push({
        pattern: this.extractGasPattern(conversation),
        category: 'optimization',
        confidence: 0.8,
        description: `Gas optimization: ${conversation.gasUsed} gas for ${conversation.actionTaken}`
      });
    }

    // Pattern 3: Contract interaction patterns
    if (input.includes('call') || input.includes('function')) {
      patterns.push({
        pattern: this.extractInteractionPattern(conversation),
        category: 'interaction',
        confidence: conversation.success ? 0.9 : 0.3,
        description: `Contract interaction pattern: ${conversation.actionTaken}`
      });
    }

    // Pattern 4: Error recovery patterns
    if (!conversation.success) {
      patterns.push({
        pattern: this.extractErrorPattern(conversation),
        category: 'error',
        confidence: 0.6,
        description: `Error pattern to avoid: ${conversation.userInput.substring(0, 50)}...`
      });
    }

    return patterns;
  }

  /**
   * Update or create a learned pattern
   */
  private async updateOrCreatePattern(patternData: Partial<LearnedPattern>): Promise<void> {
    if (!patternData.pattern) return;

    try {
      // Check if pattern already exists
      const existingPattern = this.memory.longTerm.find(p => p.pattern === patternData.pattern);
      
      if (existingPattern) {
        // Update existing pattern
        existingPattern.usageCount += 1;
        existingPattern.lastUsed = new Date();
        existingPattern.confidence = Math.min(
          0.95, 
          existingPattern.confidence + (patternData.confidence || 0) * 0.1
        );
      } else {
        // Create new pattern
        const newPattern: LearnedPattern = {
          id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: patternData.pattern,
          category: patternData.category || 'interaction',
          confidence: patternData.confidence || 0.5,
          usageCount: 1,
          lastUsed: new Date(),
          description: patternData.description || 'Learned pattern'
        };

        this.memory.longTerm.push(newPattern);
        
        // Store in KV storage if confidence is high enough
        if (newPattern.confidence >= this.LEARNING_CONFIG.AUTO_LEARN_THRESHOLD) {
          await this.kvStorage.storeLearnedPattern(newPattern);
        }
      }

    } catch (error) {
      console.error('❌ Failed to update pattern:', error);
    }
  }

  /**
   * Get relevant patterns for current context
   */
  getRelevantPatterns(userInput: string, limit: number = 5): LearnedPattern[] {
    const input = userInput.toLowerCase();
    
    return this.memory.longTerm
      .filter(pattern => {
        // Match patterns based on keywords and context
        const patternText = pattern.pattern.toLowerCase();
        return input.split(' ').some(word => patternText.includes(word));
      })
      .sort((a, b) => {
        // Sort by confidence and usage count
        const scoreA = a.confidence * 0.7 + (a.usageCount / 100) * 0.3;
        const scoreB = b.confidence * 0.7 + (b.usageCount / 100) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Get personalized suggestions based on learning
   */
  getPersonalizedSuggestions(context: string): string[] {
    const suggestions: string[] = [];
    const relevantPatterns = this.getRelevantPatterns(context, 3);
    
    for (const pattern of relevantPatterns) {
      switch (pattern.category) {
        case 'deployment':
          suggestions.push(`💡 Based on your history: ${pattern.description}`);
          break;
        case 'optimization':
          suggestions.push(`⛽ Gas tip: ${pattern.description}`);
          break;
        case 'interaction':
          suggestions.push(`🔧 Interaction tip: ${pattern.description}`);
          break;
        case 'error':
          suggestions.push(`⚠️ Avoid: ${pattern.description}`);
          break;
      }
    }

    // Add preference-based suggestions
    if (this.memory.userContext.autoConfirmLowRisk) {
      suggestions.push('🚀 Auto-confirming low-risk transactions based on your preferences');
    }

    return suggestions;
  }

  /**
   * Analyze learning insights
   */
  async generateLearningInsights(): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    
    try {
      // Analyze deployment patterns
      const deploymentPatterns = this.memory.longTerm.filter(p => p.category === 'deployment');
      if (deploymentPatterns.length > 0) {
        const avgSuccessRate = deploymentPatterns.reduce((sum, p) => sum + p.confidence, 0) / deploymentPatterns.length;
        insights.push({
          pattern: 'Smart Contract Deployment',
          frequency: deploymentPatterns.length,
          success_rate: avgSuccessRate,
          gas_optimization: this.calculateGasOptimization('deployment'),
          recommendation: avgSuccessRate > 0.8 ? 'Your deployment patterns are highly optimized' : 'Consider reviewing deployment strategies'
        });
      }

      // Analyze interaction patterns
      const interactionPatterns = this.memory.longTerm.filter(p => p.category === 'interaction');
      if (interactionPatterns.length > 0) {
        const avgSuccessRate = interactionPatterns.reduce((sum, p) => sum + p.confidence, 0) / interactionPatterns.length;
        insights.push({
          pattern: 'Contract Interactions',
          frequency: interactionPatterns.length,
          success_rate: avgSuccessRate,
          gas_optimization: this.calculateGasOptimization('interaction'),
          recommendation: this.generateInteractionRecommendation(avgSuccessRate)
        });
      }

      return insights;
    } catch (error) {
      console.error('❌ Failed to generate insights:', error);
      return [];
    }
  }

  /**
   * Save current state to persistent storage
   */
  async saveState(): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user initialized');
    }

    try {
      const state: AIAssistantState = {
        userId: this.currentUserId,
        conversationHistory: this.memory.shortTerm,
        learnedPatterns: this.memory.longTerm,
        userPreferences: this.memory.userContext,
        contractKnowledge: Array.from(this.memory.contractMemory.values()),
        lastUpdated: new Date()
      };

      await this.kvStorage.storeAssistantState(this.currentUserId, state);
      await this.kvStorage.storeUserPreferences(this.currentUserId, this.memory.userContext);
      
      console.log(`💾 AI state saved for user: ${this.currentUserId}`);
    } catch (error) {
      console.error('❌ Failed to save state:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUserId) {
      throw new Error('No user initialized');
    }

    try {
      this.memory.userContext = { ...this.memory.userContext, ...preferences };
      await this.kvStorage.storeUserPreferences(this.currentUserId, this.memory.userContext);
      
      console.log(`⚙️ User preferences updated for: ${this.currentUserId}`);
    } catch (error) {
      console.error('❌ Failed to update preferences:', error);
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): any {
    return {
      userId: this.currentUserId,
      shortTermMemory: this.memory.shortTerm.length,
      longTermPatterns: this.memory.longTerm.length,
      contractKnowledge: this.memory.contractMemory.size,
      learningEnabled: this.learningEnabled,
      memoryUtilization: {
        shortTerm: `${this.memory.shortTerm.length}/${this.LEARNING_CONFIG.MAX_SHORT_TERM_ENTRIES}`,
        longTerm: this.memory.longTerm.length,
        avgPatternConfidence: this.memory.longTerm.length > 0 
          ? this.memory.longTerm.reduce((sum, p) => sum + p.confidence, 0) / this.memory.longTerm.length 
          : 0
      }
    };
  }

  // Helper methods for pattern extraction
  private extractDeploymentPattern(conversation: ConversationEntry): string {
    return `deploy_${conversation.actionTaken}_success_${conversation.gasUsed}`;
  }

  private extractGasPattern(conversation: ConversationEntry): string {
    return `gas_${conversation.actionTaken}_${conversation.gasUsed}`;
  }

  private extractInteractionPattern(conversation: ConversationEntry): string {
    return `interact_${conversation.actionTaken}_${conversation.success}`;
  }

  private extractErrorPattern(conversation: ConversationEntry): string {
    return `error_${conversation.actionTaken}_failed`;
  }

  private calculateGasOptimization(category: string): number {
    // Calculate gas optimization percentage based on historical data
    return Math.random() * 20 + 5; // Placeholder calculation
  }

  private generateInteractionRecommendation(successRate: number): string {
    if (successRate > 0.9) return 'Excellent interaction patterns! Keep up the good work.';
    if (successRate > 0.7) return 'Good interaction success rate. Consider optimizing failed patterns.';
    return 'Review your interaction patterns to improve success rate.';
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      preferredGasPrice: 'standard',
      defaultNetwork: '0G-Galileo-Testnet',
      autoConfirmLowRisk: false,
      verboseLogging: true,
      favoriteContracts: [],
      customRPCEndpoints: []
    };
  }

  private async createInitialState(userId: string): Promise<void> {
    const initialState: AIAssistantState = {
      userId,
      conversationHistory: [],
      learnedPatterns: [],
      userPreferences: this.getDefaultUserPreferences(),
      contractKnowledge: [],
      lastUpdated: new Date()
    };

    await this.kvStorage.storeAssistantState(userId, initialState);
    console.log(`🆕 Created initial state for user: ${userId}`);
  }
}

export default AIStateManager;