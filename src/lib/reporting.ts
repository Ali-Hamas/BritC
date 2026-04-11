import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BusinessStats, ActivityEvent } from './metrics';

export interface FinancialAlert {
  id: string;
  type: 'warning' | 'opportunity' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

export const ReportingService = {
  /**
   * Recent strategic alerts and anomalies
   */
  getRecentAlerts: (): FinancialAlert[] => {
    return [
      {
        id: '1',
        type: 'opportunity',
        title: 'High Conversion Potential',
        message: 'Tech startups in London are showing 20% higher response rates this week.',
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        type: 'warning',
        title: 'Marketing ROI Dip',
        message: 'Campaign "Cloud Q3" is underperforming compared to regional benchmark.',
        timestamp: new Date().toISOString()
      }
    ];
  },

  /**
   * Generates a premium PDF business report
   */
  async generateWeeklyPDF(profile: any, stats: BusinessStats, activity: ActivityEvent[], aiSummary: string) {
    const doc = new jsPDF() as any;
    const businessName = profile?.business_name || 'BritSync Business';

    // 1. Header & Title
    doc.setFillColor(31, 41, 55); // Dark Slate
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('BritSync Business Pulse', 15, 25);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 15, 33);

    // 2. Business Info
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Client: ${businessName}`, 15, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Industry: ${profile?.industry || 'N/A'}`, 15, 62);
    doc.text(`Location: ${profile?.location || 'UK'}`, 15, 67);

    // 3. KPI Metrics Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Metrics', 15, 80);

    const kpiData = [
      ['Total Leads Found', stats.totalLeads.toString()],
      ['Active Outreach Campaigns', stats.activeCampaigns.toString()],
      ['Business Documents Created', stats.documentsCreated.toString()],
      ['Projected Monthly Revenue', `£${stats.revenueForecast.toLocaleString()}`],
      ['Lead-to-Doc Conversion', `${stats.conversionRate}%`],
    ];

    autoTable(doc, {
      startY: 85,
      head: [['Metric', 'Value']],
      body: kpiData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241], textColor: 255 }, // Indigo
      styles: { fontSize: 10 }
    });

    // 4. AI Strategic Summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BritC Strategic Insight', 15, finalY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitSummary = doc.splitTextToSize(aiSummary, 180);
    doc.text(splitSummary, 15, finalY + 8);

    // 5. Recent Activity
    const activityY = finalY + (splitSummary.length * 5) + 20;
    if (activityY < 270) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Recent Activities', 15, activityY);

      const activityData = activity.slice(0, 5).map(a => [
        new Date(a.timestamp).toLocaleDateString(),
        a.title,
        a.description
      ]);

      autoTable(doc, {
        startY: activityY + 5,
        head: [['Date', 'Activity', 'Details']],
        body: activityData,
        theme: 'striped',
        headStyles: { fillColor: [107, 114, 128], textColor: 255 },
        styles: { fontSize: 9 }
      });
    }

    // 6. Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Powered by BritSync AI — Confidential Business Intelligence', 105, 290, { align: 'center' });
    }

    // Save PDF
    doc.save(`BritSync_Report_${businessName.replace(/\s+/g, '_')}.pdf`);
  },

  /**
   * Generates a "Pitch Deck" styled PDF
   */
  async generateStrategicSlideDeck(params: any) {
    const doc = new jsPDF('l', 'mm', 'a4') as any; // Landscape for "slides"
    const title = params.businessTitle || 'Strategic Growth Plan';
    
    // Slide 1: Title
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 0, 297, 210, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.text(title, 148, 90, { align: 'center' });
    doc.setFontSize(20);
    doc.text(`Prepared by BritC — ${params.focus || 'Strategic Partner'}`, 148, 110, { align: 'center' });
    
    // Slide 2: Market Analysis
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 297, 210, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(24);
    doc.text('Market Positioning', 20, 30);
    doc.setFontSize(14);
    doc.text('Strategy points based on your current profile and goals:', 20, 45);
    
    // Slide 3: Growth Roadmap (Mocked visualization)
    doc.addPage();
    doc.text('Strategic Growth Roadmap', 20, 30);
    
    // Save
    const fileName = `BritC_Strategy_${title.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return { fileName, status: 'generated' };
  },

  /**
   * Generates a comprehensive, premium Investor Profile PDF
   * Inspired by the GAIO 19-page strategic report
   */
  async generateProfessionalInvestorProfile(profile: any, investmentStrategy: any) {
    const doc = new jsPDF() as any;
    const businessName = profile?.business_name || 'BritSync Enterprise';
    
    // Slide 1: Executive Cover
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(32);
    doc.text(businessName, 105, 100, { align: 'center' });
    doc.setFontSize(18);
    doc.text('Strategic Opportunity & Investor Profile', 105, 115, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`February 2026 — Prepared by BritC`, 105, 140, { align: 'center' });

    // Slide 2: 3-Year Financial Model
    doc.addPage();
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(22);
    doc.text('3-Year Financial Projection', 15, 30);
    doc.setFontSize(10);
    doc.text('Rights-led platform with controlled cost growth and multi-pillar revenue.', 15, 40);

    const financialData = [
      ['Year 1', `£${investmentStrategy.year1.revenue.toLocaleString()}`, `£${investmentStrategy.year1.cost.toLocaleString()}`, investmentStrategy.year1.margin, investmentStrategy.year1.goal],
      ['Year 2', `£${investmentStrategy.year2.revenue.toLocaleString()}`, `£${investmentStrategy.year2.cost.toLocaleString()}`, investmentStrategy.year2.margin, investmentStrategy.year2.goal],
      ['Year 3', `£${investmentStrategy.year3.revenue.toLocaleString()}`, `£${investmentStrategy.year3.cost.toLocaleString()}`, investmentStrategy.year3.margin, investmentStrategy.year3.goal],
    ];

    autoTable(doc, {
      startY: 50,
      head: [['Stage', 'Revenue (Est)', 'Op Costs', 'Margin', 'Strategic Goal']],
      body: financialData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      styles: { fontSize: 9 }
    });

    // Slide 3: Risk & Mitigation Framework
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(22);
    doc.text('Risk & Mitigation Framework', 15, finalY);

    const riskData = investmentStrategy.risks.map((r: any) => [r.category, r.risk, r.mitigation]);

    autoTable(doc, {
      startY: finalY + 10,
      head: [['Category', 'Identified Risk', 'Strategic Mitigation']],
      body: riskData,
      theme: 'striped',
      headStyles: { fillColor: [107, 114, 128], textColor: 255 },
      styles: { fontSize: 9 }
    });

    // Slide 4: Use of Funds
    doc.addPage();
    doc.setFontSize(22);
    doc.text('Primary Capital Deployment', 15, 30);
    
    const fundsData = [
      ['Global Marketing & PR', '30%', 'Positioning as a world-class AI movement.'],
      ['Platform Activation', '25%', 'Mass participation at near-zero marginal cost.'],
      ['Expert Jury & Mentors', '15%', 'Credibility without heavy logistics.'],
      ['Flagship Event Host', '30%', 'London Grand Finale with premium production.'],
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Deployment Area', 'Allocation', 'Objective']],
      body: fundsData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('BritC Advanced Strategic Intelligence — Strictly Confidential', 105, 285, { align: 'center' });
    }

    const fileName = `BritC_Investor_Profile_${businessName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    return { fileName, status: 'generated' };
  }
};
