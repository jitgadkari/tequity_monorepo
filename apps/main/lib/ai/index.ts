/**
 * AI Module - Unified exports for RAG pipeline
 */

// Embeddings
export {
  getEmbedding,
  embedRecords,
  getQueryEmbedding,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  type EmbeddingRecord,
} from './embeddings'

// Vector Store
export {
  initVectorStore,
  upsertEmbeddings,
  searchSimilar,
  searchMultiFile,
  searchByFiles,
  deleteByFileId,
  deleteBySource,
  getEmbeddingCount,
  VECTOR_SIZE,
  type VectorRecord,
  type SearchResult,
} from './vector-store'

// RAG Chain
export {
  identifyCategory,
  classifyQuery,
  decomposeQuery,
  generateAnswer,
  processQuery,
  processQueryStream,
  OPENAI_LLM_MODEL,
  type RAGResponse,
  type QueryClassification,
} from './rag-chain'

// Prompts
export {
  getFinancialCategoryPrompt,
  getBasicQAPrompt,
  getCombinedAnswerPrompt,
  getDecompositionPrompt,
  getFileDescriptionPrompt,
  getFileRelevancePrompt,
  CATEGORY_KEYWORDS,
  FINANCIAL_ASSISTANT_SYSTEM_PROMPT,
  FINANCIAL_CATEGORIES,
} from './prompts'
