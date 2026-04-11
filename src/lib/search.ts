export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const SearchService = {
  /**
   * Mock implementation of web research.
   * In a real app, this would call Brave Search, Serper, or Tavily.
   */
  async research(query: string): Promise<SearchResult[]> {
    console.log(`Researching: ${query}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock results based on query keywords
    const keywords = query.toLowerCase();
    
    if (keywords.includes('trend') || keywords.includes('market')) {
      return [
        {
          title: "UK Small Business Trends 2026",
          url: "https://business-trends.uk/2026-report",
          snippet: "Small businesses in the UK are increasingly adopting AI-driven automation for lead generation and customer service..."
        },
        {
          title: "The Rise of Agentic AI in Small Enterprises",
          url: "https://tech-insights.co.uk/agentic-ai",
          snippet: "New research shows that companions like BritC are saving UK business owners up to 15 hours a week on administrative tasks."
        }
      ];
    }

    if (keywords.includes('competitor') || keywords.includes('pricing')) {
      return [
        {
          title: "Competitor Pricing Analysis Guide",
          url: "https://marketing-pro.uk/competitor-analysis",
          snippet: "Understanding how your local competitors price their service is key to winning high-value contracts in the UK market."
        }
      ];
    }

    return [
      {
        title: `Search results for "${query}"`,
        url: "https://google.com/search?q=" + encodeURIComponent(query),
        snippet: "This query involves real-time market data. In production, this would return live snippets from the web."
      }
    ];
  }
};
