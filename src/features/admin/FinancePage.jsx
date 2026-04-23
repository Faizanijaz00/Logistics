import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useVehicleStore } from '../../store';
import { useIsMobile } from '../../hooks/useIsMobile';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateKey(year, month, day) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function getMonthLabel(date) {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function isSameDay(dateStr) {
  const today = new Date();
  return (
    formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()) ===
    dateStr
  );
}

export function FinancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [costView, setCostView] = useState('yearly'); // 'monthly' | 'yearly' | 'total'
  const [payerPopover, setPayerPopover] = useState(null); // { rowIdx, field }
  const mobile = useIsMobile();
  const { vehicles } = useVehicleStore();

  // Build events map grouped by YYYY-MM-DD
  const eventsMap = useMemo(() => {
    const map = {};

    const addEvent = (dateStr, event) => {
      if (!dateStr) return;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    (vehicles || []).forEach((vehicle) => {
      const vehicleName = `${vehicle.make} ${vehicle.model}`;
      const vehicleId = vehicle.id;

      if (vehicle.tax?.expiryDate) {
        addEvent(vehicle.tax.expiryDate.slice(0, 10), {
          date: vehicle.tax.expiryDate.slice(0, 10),
          type: 'Tax Expiry',
          color: '#c4001a',
          vehicleName,
          vehicleId,
        });
      }

      if (vehicle.mot?.expiryDate) {
        addEvent(vehicle.mot.expiryDate.slice(0, 10), {
          date: vehicle.mot.expiryDate.slice(0, 10),
          type: 'MOT Expiry',
          color: '#cc7700',
          vehicleName,
          vehicleId,
        });
      }

      if (vehicle.maintenance?.nextService) {
        addEvent(vehicle.maintenance.nextService.slice(0, 10), {
          date: vehicle.maintenance.nextService.slice(0, 10),
          type: 'Next Service',
          color: '#0061bd',
          vehicleName,
          vehicleId,
        });
      }

      if (vehicle.insurance?.expiryDate) {
        addEvent(vehicle.insurance.expiryDate.slice(0, 10), {
          date: vehicle.insurance.expiryDate.slice(0, 10),
          type: 'Insurance Expiry',
          color: '#7c3aed',
          vehicleName,
          vehicleId,
        });
      }
    });

    return map;
  }, [vehicles]);

  // Calendar calculations
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);

  // Day of week for the 1st (0=Sun, 1=Mon, ..., 6=Sat)
  // We want Monday-start, so shift: Mon=0, Tue=1, ..., Sun=6
  const firstDayRaw = new Date(year, month, 1).getDay();
  const startOffset = (firstDayRaw + 6) % 7; // Monday-start offset

  // Previous month days to fill leading blanks
  const prevMonthDays = getDaysInMonth(year, month - 1);

  // Build calendar rows
  const totalCells = startOffset + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const calendarCells = [];

  for (let i = 0; i < rows * 7; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1) {
      // Previous month
      calendarCells.push({
        day: prevMonthDays + dayNum,
        currentMonth: false,
        dateKey: null,
      });
    } else if (dayNum > daysInMonth) {
      // Next month
      calendarCells.push({
        day: dayNum - daysInMonth,
        currentMonth: false,
        dateKey: null,
      });
    } else {
      const dateKey = formatDateKey(year, month, dayNum);
      calendarCells.push({
        day: dayNum,
        currentMonth: true,
        dateKey,
      });
    }
  }

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const dayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const selectedDayEvents = selectedDay ? eventsMap[selectedDay] || [] : [];

  // Annual costs calculations
  const costRows = (vehicles || []).map((vehicle) => {
    const insurance = vehicle.insurance?.annualCost || 0;
    const tax = vehicle.tax?.annualCost || 0;
    const service = vehicle.maintenance?.serviceCost || 0;
    const fuel = vehicle.fuel?.totalCost || 0;
    const total = insurance + tax + service + fuel;
    return {
      name: `${vehicle.make} ${vehicle.model}`,
      insurance,
      tax,
      service,
      fuel,
      total,
      insurancePaidBy: vehicle.insurance?.paidBy || '',
      taxPaidBy: vehicle.tax?.paidBy || '',
      servicePaidBy: vehicle.maintenance?.paidBy || '',
      insuranceBankAccount: vehicle.insurance?.bankAccount || '',
      taxBankAccount: vehicle.tax?.bankAccount || '',
      serviceBankAccount: vehicle.maintenance?.bankAccount || '',
    };
  });

  const fleetTotals = costRows.reduce(
    (acc, row) => ({
      insurance: acc.insurance + row.insurance,
      tax: acc.tax + row.tax,
      service: acc.service + row.service,
      fuel: acc.fuel + row.fuel,
      total: acc.total + row.total,
    }),
    { insurance: 0, tax: 0, service: 0, fuel: 0, total: 0 }
  );

  const formatCurrency = (val) => `\u00A3${val.toLocaleString()}`;
  const displayCost = (annualVal) => {
    if (costView === 'monthly') return `£${(annualVal / 12).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (costView === 'total') return `£${(annualVal * 5).toLocaleString()}`; // 5-year total
    return formatCurrency(annualVal);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Sticky Header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          borderBottom: '1px solid #e0e0e0',
          padding: mobile ? '12px 16px' : '16px 40px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
          Finance
        </h1>
      </div>

      {/* Content Area */}
      <div
        style={{
          padding: mobile ? '16px' : '32px 40px',
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        {/* Section A: Calendar Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            marginBottom: '24px',
            padding: mobile ? '16px' : '24px',
          }}
        >
          {/* Month Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <button
              onClick={goToPrevMonth}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <span style={{ fontWeight: '600', fontSize: '16px' }}>
              {getMonthLabel(currentMonth)}
            </span>
            <button
              onClick={goToNextMonth}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Legend */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: mobile ? '8px' : '16px',
              marginBottom: '16px',
              justifyContent: 'center',
            }}
          >
            {[
              { label: 'TAX', color: '#c4001a' },
              { label: 'MOT', color: '#cc7700' },
              { label: 'SVC', color: '#0061bd' },
              { label: 'INS', color: '#7c3aed' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  color: '#555',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: item.color,
                  }}
                />
                <span style={{ fontWeight: '500' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Day Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              marginBottom: '2px',
              borderBottom: '1px solid #e8e8e8',
            }}
          >
            {dayHeaders.map((d) => (
              <div
                key={d}
                style={{
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#626669',
                  padding: '8px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '1px',
              background: '#f0f0f0',
              border: '1px solid #f0f0f0',
            }}
          >
            {calendarCells.map((cell, idx) => {
              const isToday = cell.dateKey && isSameDay(cell.dateKey);
              const isSelected = cell.dateKey && cell.dateKey === selectedDay;
              const events = cell.dateKey ? eventsMap[cell.dateKey] || [] : [];
              const hasEvents = events.length > 0;

              const eventAbbreviations = {
                'Tax Expiry': { abbr: 'TAX', color: '#c4001a', bg: '#fef2f2' },
                'MOT Expiry': { abbr: 'MOT', color: '#cc7700', bg: '#fffbeb' },
                'Next Service': { abbr: 'SVC', color: '#0061bd', bg: '#eff6ff' },
                'Insurance Expiry': { abbr: 'INS', color: '#7c3aed', bg: '#f5f3ff' },
              };

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.currentMonth && cell.dateKey) {
                      setSelectedDay(
                        cell.dateKey === selectedDay ? null : cell.dateKey
                      );
                    }
                  }}
                  style={{
                    padding: mobile ? '4px 2px 6px' : '6px 4px 8px',
                    textAlign: 'center',
                    cursor: cell.currentMonth ? 'pointer' : 'default',
                    minHeight: mobile ? '54px' : '72px',
                    background: isSelected
                      ? '#1a1a1a'
                      : hasEvents && cell.currentMonth
                      ? '#fafafa'
                      : '#ffffff',
                    transition: 'background 0.15s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: mobile ? '12px' : '13px',
                      fontWeight: isToday || isSelected ? '700' : '400',
                      color: isSelected
                        ? '#ffffff'
                        : isToday
                        ? '#ffffff'
                        : cell.currentMonth
                        ? '#1a1a1a'
                        : '#ccc',
                      marginBottom: '4px',
                      width: '32px',
                      height: '32px',
                      lineHeight: '32px',
                      borderRadius: '50%',
                      background: isSelected
                        ? '#1a1a1a'
                        : isToday
                        ? '#0061bd'
                        : 'transparent',
                      boxShadow: isToday && !isSelected ? '0 2px 6px rgba(0,97,189,0.35)' : 'none',
                    }}
                  >
                    {cell.day}
                  </div>
                  {hasEvents && cell.currentMonth && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      {events.slice(0, 3).map((evt, i) => {
                        const config = eventAbbreviations[evt.type] || { abbr: '?', color: '#999', bg: '#f5f5f5' };
                        return (
                          <div
                            key={i}
                            style={{
                              fontSize: mobile ? '8px' : '9px',
                              fontWeight: '700',
                              color: isSelected ? '#ffffff' : config.color,
                              background: isSelected ? 'rgba(255,255,255,0.2)' : config.bg,
                              borderRadius: '3px',
                              padding: mobile ? '1px 4px' : '1px 6px',
                              letterSpacing: '0.03em',
                              lineHeight: mobile ? '13px' : '15px',
                              whiteSpace: 'nowrap',
                              border: isSelected ? 'none' : `1px solid ${config.color}22`,
                            }}
                          >
                            {config.abbr}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Day Events */}
          {selectedDay && (
            <div style={{
              marginTop: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              padding: mobile ? '14px' : '20px',
            }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '14px',
                  marginTop: 0,
                  color: '#1a1a1a',
                }}
              >
                {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h3>
              {selectedDayEvents.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
                  No events on this day.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedDayEvents.map((evt, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        background: '#ffffff',
                        borderRadius: '6px',
                        borderLeft: `4px solid ${evt.color}`,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#1a1a1a' }}>
                          {evt.type}
                        </div>
                        <div style={{ fontSize: '12px', color: '#626669', marginTop: '2px' }}>
                          {evt.vehicleName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section B: Annual Costs Summary */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '4px',
            border: '1px solid #e0e0e0',
            padding: mobile ? '16px' : '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
              {costView === 'monthly' ? 'Monthly Costs' : costView === 'total' ? 'Total Ongoing Costs' : 'Annual Costs Summary'}
            </h2>
            <div style={{ display: 'flex', gap: '2px', background: '#f0f0f0', borderRadius: '8px', padding: '3px' }}>
              {[['monthly', 'Per Month'], ['yearly', 'Per Year'], ['total', 'Total']].map(([val, label]) => (
                <button key={val} onClick={() => setCostView(val)} style={{
                  padding: '5px 14px', fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer', borderRadius: '6px',
                  background: costView === val ? '#000' : 'transparent',
                  color: costView === val ? '#fff' : '#666',
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: mobile ? 'auto' : 'visible' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                    }}
                  >
                    Vehicle
                  </th>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                    }}
                  >
                    Insurance
                  </th>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                    }}
                  >
                    Tax
                  </th>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                    }}
                  >
                    Service
                  </th>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                    }}
                  >
                    Fuel
                  </th>
                  <th
                    style={{
                      fontSize: '12px',
                      textTransform: 'uppercase',
                      color: '#626669',
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                    }}
                  >
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {costRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid #f0f0f0',
                      background: idx % 2 === 1 ? '#fafafa' : 'transparent',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        textAlign: 'left',
                      }}
                    >
                      {row.name}
                    </td>
                    {[
                      { key: 'insurance', value: row.insurance, payer: row.insurancePaidBy, bank: row.insuranceBankAccount },
                      { key: 'tax', value: row.tax, payer: row.taxPaidBy, bank: row.taxBankAccount },
                      { key: 'service', value: row.service, payer: row.servicePaidBy, bank: row.serviceBankAccount },
                      { key: 'fuel', value: row.fuel, payer: null, bank: null },
                    ].map((cell) => (
                      <td
                        key={cell.key}
                        style={{
                          padding: '14px 16px',
                          fontSize: '14px',
                          textAlign: 'right',
                          position: 'relative',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {displayCost(cell.value)}
                          {cell.payer !== null && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                const isOpen = payerPopover?.rowIdx === idx && payerPopover?.field === cell.key;
                                setPayerPopover(isOpen ? null : { rowIdx: idx, field: cell.key });
                              }}
                              style={{
                                display: 'inline-block',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: cell.payer ? '#4a90d9' : '#ccc',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </span>
                        {payerPopover?.rowIdx === idx && payerPopover?.field === cell.key && (
                          <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setPayerPopover(null)} />
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: '8px',
                              zIndex: 999,
                              background: '#fff',
                              border: '1px solid #e0e0e0',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                              whiteSpace: 'nowrap',
                              fontSize: '13px',
                              color: '#333',
                            }}>
                              {cell.payer
                                ? <><div><strong>Paid by:</strong> {cell.payer}</div>{cell.bank && <div style={{ marginTop: '4px', color: '#666' }}><strong>Account:</strong> {cell.bank}</div>}</>
                                : <span style={{ color: '#999' }}>Not set</span>
                              }
                            </div>
                          </>
                        )}
                      </td>
                    ))}
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        textAlign: 'right',
                        fontWeight: '500',
                      }}
                    >
                      {displayCost(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{
                    borderTop: '2px solid #e0e0e0',
                  }}
                >
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'left',
                    }}
                  >
                    Fleet Total
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'right',
                    }}
                  >
                    {displayCost(fleetTotals.insurance)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'right',
                    }}
                  >
                    {displayCost(fleetTotals.tax)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'right',
                    }}
                  >
                    {displayCost(fleetTotals.service)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'right',
                    }}
                  >
                    {displayCost(fleetTotals.fuel)}
                  </td>
                  <td
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      fontWeight: '700',
                      textAlign: 'right',
                    }}
                  >
                    {displayCost(fleetTotals.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinancePage;
