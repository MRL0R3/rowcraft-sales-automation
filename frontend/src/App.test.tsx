import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => vi.restoreAllMocks());

describe('dashboard interactions', () => {
  it('shows synthetic metrics and recalculates status filters', () => {
    render(<App />);
    expect(screen.getByText('DEMO DATA')).toBeInTheDocument();
    expect(screen.getByText('$214.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'refunded' } });
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0);
    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });
  it('keeps prior data when an uploaded file is invalid', async () => {
    render(<App />);
    const file = new File(['bad,header\n1,2'], 'bad.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Choose a CSV file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Missing required columns'));
    expect(screen.getByText('$214.00')).toBeInTheDocument();
  });
  it('loads valid local CSV into the interactive report', async () => {
    render(<App />);
    const csv = 'order_id,date,product,quantity,unit_price,status,currency\nX-1,2026-01-01,Local item,2,5.25,completed,USD';
    const file = new File([csv], 'local.csv', { type: 'text/csv' });
    fireEvent.change(screen.getByLabelText('Choose a CSV file'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getAllByText('$10.50').length).toBeGreaterThan(0));
    expect(screen.getByText('YOUR FILE')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restore sample' }));
    expect(screen.getByText('DEMO DATA')).toBeInTheDocument();
    expect(screen.getByText('$214.00')).toBeInTheDocument();
  });
  it('keeps KPIs scoped to filters while search narrows only the detail table', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Search rows'), { target: { value: 'ORD-1006' } });
    expect(screen.getByText(/Showing 1 of 8 filtered line items/)).toBeInTheDocument();
    expect(screen.getByText('$214.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'cancelled' } });
    expect(screen.getByText(/Showing 1 of 1 filtered line items/)).toBeInTheDocument();
    expect(screen.getByText('No completed revenue for a rate')).toBeInTheDocument();
  });
  it('shows actionable row errors even when current filters have no matches', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'refunded' } });
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'Canvas Tote' } });
    expect(screen.getByText('No rows match these filters.')).toBeInTheDocument();
    const csv = 'order_id,date,product,quantity,unit_price,status,currency\nX,2026-01-01,Item,0,3.00,completed,USD';
    fireEvent.change(screen.getByLabelText('Choose a CSV file'), { target: { files: [new File([csv], 'invalid.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('CSV row 2'));
    expect(screen.getByRole('status')).toHaveTextContent('Quantity must be a positive whole number');
  });
  it('updates date and product selections and triggers real export downloads', async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Through date'), { target: { value: '2026-11-30' } });
    expect(screen.getByText('$90.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'Ceramic Mug' } });
    expect(screen.getAllByText('$50.00').length).toBeGreaterThan(0);
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:rowcraft-test');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: /Export summary/ }));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: /Monthly CSV/ }));
    expect(createUrl).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status')).toHaveTextContent('Monthly CSV downloaded for the current report filters');
  });
});
