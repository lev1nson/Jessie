'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Mail, Database, Clock, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface IndexingStats {
  totalEmails: number;
  processedEmails: number;
  indexedEmails: number;
  lastSyncAt: string | null;
  isProcessing: boolean;
  errorCount: number;
}

export function SettingsPage() {
  const [stats, setStats] = useState<IndexingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupConfirmText, setCleanupConfirmText] = useState('');
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/indexing/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch indexing stats');
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const triggerSync = async () => {
    try {
      setSyncLoading(true);
      const body = fromDate ? { fromDate } : {};
      const response = await fetch('/api/indexing/sync', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }
      await fetchStats(); // Refresh stats after triggering
      setFromDate(''); // Reset date after successful sync
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (cleanupConfirmText !== 'DELETE ALL EMAILS') {
      setError('Введите точно: DELETE ALL EMAILS');
      return;
    }

    try {
      setCleanupLoading(true);
      const response = await fetch('/api/indexing/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: cleanupConfirmText })
      });
      
      if (!response.ok) {
        throw new Error('Failed to cleanup database');
      }
      
      const result = await response.json();
      setShowCleanupConfirm(false);
      setCleanupConfirmText('');
      await fetchStats(); // Refresh stats after cleanup
      setError(null);
      alert(`Успешно удалено ${result.deletedCount} писем`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup database');
    } finally {
      setCleanupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/dashboard" 
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Настройки системы</h1>
        </div>

        {/* Indexing Status Card */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Database className="h-5 w-5" />
              Статус индексации писем
            </h2>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-2 hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {loading && !stats ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Загрузка статистики...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: stats.totalEmails > 0 
                      ? `${(stats.indexedEmails / stats.totalEmails) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Всего писем</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalEmails.toLocaleString()}</p>
                </div>

                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Обработано</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.processedEmails.toLocaleString()}</p>
                </div>

                <div className="bg-accent/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Проиндексировано</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stats.indexedEmails.toLocaleString()}</p>
                </div>
              </div>

              {/* Status Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Последняя синхронизация: {' '}
                    {stats.lastSyncAt 
                      ? new Date(stats.lastSyncAt).toLocaleString('ru-RU')
                      : 'Никогда'
                    }
                  </span>
                </div>

                {stats.isProcessing && (
                  <div className="flex items-center gap-2 text-primary">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Обработка в процессе...</span>
                  </div>
                )}

                {stats.errorCount > 0 && (
                  <div className="text-destructive text-sm">
                    Ошибок при обработке: {stats.errorCount}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-border space-y-4">
                {/* Date-based sync */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Синхронизация с определенной даты (опционально)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                        disabled={stats.isProcessing || syncLoading}
                      />
                    </div>
                    <button
                      onClick={triggerSync}
                      disabled={stats.isProcessing || syncLoading}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {syncLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                      {stats.isProcessing || syncLoading ? 'Синхронизация...' : 'Запустить синхронизацию'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Если дата не указана, будут загружены письма с последней синхронизации
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Database Management */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Управление базой данных
          </h2>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive font-medium mb-2">⚠️ Опасная зона</p>
            <p className="text-sm text-muted-foreground">
              Эта операция удалит ВСЕ письма из базы данных. Это действие необратимо!
            </p>
          </div>

          {!showCleanupConfirm ? (
            <button
              onClick={() => setShowCleanupConfirm(true)}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Очистить базу данных
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Для подтверждения введите: <code className="bg-accent px-1 rounded">DELETE ALL EMAILS</code>
                </label>
                <input
                  type="text"
                  value={cleanupConfirmText}
                  onChange={(e) => setCleanupConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="DELETE ALL EMAILS"
                  disabled={cleanupLoading}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCleanup}
                  disabled={cleanupLoading || cleanupConfirmText !== 'DELETE ALL EMAILS'}
                  className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {cleanupLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {cleanupLoading ? 'Удаление...' : 'Подтвердить удаление'}
                </button>
                <button
                  onClick={() => {
                    setShowCleanupConfirm(false);
                    setCleanupConfirmText('');
                  }}
                  disabled={cleanupLoading}
                  className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Account Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Информация об аккаунте</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Gmail подключен и настроен для индексации</p>
            <p>Автоматическая синхронизация: каждые 15 минут</p>
            <p>Поддерживаемые форматы вложений: PDF, DOCX</p>
            <p className="text-primary">✓ Дублирующиеся письма автоматически пропускаются</p>
            <p className="text-primary">✓ Векторизация происходит только для новых писем</p>
          </div>
        </div>
      </div>
    </div>
  );
}