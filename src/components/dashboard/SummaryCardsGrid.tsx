import React from 'react';
import { SummaryMetric } from '../../types/finance';
import { SummaryCard } from './SummaryCard';

interface SummaryCardsGridProps {
  metrics: SummaryMetric[];
}

export const SummaryCardsGrid: React.FC<SummaryCardsGridProps> = ({ metrics }) => {
  return (
    <section aria-label="Financial Summary Cards">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <SummaryCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  );
};
