'use client';

import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface FinancialRow {
  projectId: string;
  budget: number | null;
  invoiced: number | null;
  collected: number | null;
  costs: number | null;
  notes: string | null;
  project: { id: string; name: string; client: string | null; status: string };
}

export default function FinancialPage() {
  const [data, setData] = useState<FinancialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/financial')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function fmt(val: number | null): string {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  const totals = data.reduce(
    (acc, row) => ({
      budget: acc.budget + (row.budget || 0),
      invoiced: acc.invoiced + (row.invoiced || 0),
      collected: acc.collected + (row.collected || 0),
      costs: acc.costs + (row.costs || 0),
    }),
    { budget: 0, invoiced: 0, collected: 0, costs: 0 }
  );

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Budget, invoicing, and collection across all projects</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Budget', value: fmt(totals.budget), color: 'text-gray-900' },
          { label: 'Total Invoiced', value: fmt(totals.invoiced), color: 'text-blue-600' },
          { label: 'Total Collected', value: fmt(totals.collected), color: 'text-green-600' },
          { label: 'Total Costs', value: fmt(totals.costs), color: 'text-red-600' },
        ].map((card) => (
          <div key={card.label} className="card">
            <p className="text-xs text-gray-500 uppercase font-medium">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : data.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No financial data yet. Add financial data in project settings.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="px-6 py-3 font-medium">Project</th>
                <th className="px-6 py-3 font-medium">Client</th>
                <th className="px-6 py-3 font-medium text-right">Budget</th>
                <th className="px-6 py-3 font-medium text-right">Invoiced</th>
                <th className="px-6 py-3 font-medium text-right">Collected</th>
                <th className="px-6 py-3 font-medium text-right">Costs</th>
                <th className="px-6 py-3 font-medium text-right">Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => {
                const net = (row.collected || 0) - (row.costs || 0);
                const invoiceOverdue = (row.invoiced || 0) > (row.collected || 0);
                return (
                  <tr key={row.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/projects/${row.project.id}`} className="font-medium text-brand-600 hover:underline">
                        {row.project.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{row.project.client || '-'}</td>
                    <td className="px-6 py-3 text-right text-gray-900">{fmt(row.budget)}</td>
                    <td className="px-6 py-3 text-right text-blue-600">{fmt(row.invoiced)}</td>
                    <td className="px-6 py-3 text-right text-green-600">
                      {fmt(row.collected)}
                      {invoiceOverdue && (
                        <span className="ml-1 text-xs text-red-500 font-medium">overdue</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-red-600">{fmt(row.costs)}</td>
                    <td className={`px-6 py-3 text-right font-medium ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmt(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
