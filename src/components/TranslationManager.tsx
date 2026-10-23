import React, { useState } from 'react';
import { Languages, Plus, Search, Trash2, Edit2, CheckCircle2, BookOpen, Layers } from 'lucide-react';
import {
  getActiveDictionary,
  saveCustomWord,
  removeCustomWord,
  DEFAULT_TRANSLATION_DICTIONARY,
} from '../utils/translationDictionary';

export const TranslationManager: React.FC = () => {
  const [dictionary, setDictionary] = useState<Record<string, string>>(() => getActiveDictionary());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOM' | 'BUILTIN'>('ALL');

  // Form State for Add / Edit
  const [englishInput, setEnglishInput] = useState('');
  const [arabicInput, setArabicInput] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveTranslation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!englishInput.trim() || !arabicInput.trim()) return;

    const updatedDict = saveCustomWord(englishInput, arabicInput);
    setDictionary({ ...updatedDict });

    setEnglishInput('');
    setArabicInput('');
    setEditingKey(null);

    setSuccessMessage('Translation dictionary updated! / تم حفظ الترجمة في القاموس');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEdit = (engKey: string) => {
    setEnglishInput(engKey);
    setArabicInput(dictionary[engKey] || '');
    setEditingKey(engKey);
  };

  const handleDeleteCustom = (engKey: string) => {
    if (confirm(`Remove custom translation for "${engKey}"? / هل تريد حذف ترجمة الكلمة؟`)) {
      const updatedDict = removeCustomWord(engKey);
      setDictionary({ ...updatedDict });
      setSuccessMessage(`Deleted translation for "${engKey}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Process dictionary list
  const allKeys = Object.keys(dictionary).sort();

  const filteredKeys = allKeys.filter((key) => {
    const engWord = key;
    const arWord = dictionary[key];
    const matchesSearch =
      engWord.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arWord.includes(searchTerm);

    const isCustom = !DEFAULT_TRANSLATION_DICTIONARY[key] || DEFAULT_TRANSLATION_DICTIONARY[key] !== dictionary[key];

    if (filterType === 'CUSTOM') return matchesSearch && isCustom;
    if (filterType === 'BUILTIN') return matchesSearch && !isCustom;
    return matchesSearch;
  });

  const totalWords = allKeys.length;
  const builtinCount = Object.keys(DEFAULT_TRANSLATION_DICTIONARY).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Languages className="w-5 h-5 text-indigo-600" />
            Offline Bilingual Translation Dictionary / قاموس الترجمة الآلية
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Manage auto-translation dictionary used for products when typing English names. Works 100% offline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-50 text-indigo-800 font-bold px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            {totalWords} Active Words
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center gap-2 text-xs text-indigo-900 font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      <form onSubmit={handleSaveTranslation} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h4 className="font-bold text-xs text-slate-800 flex items-center justify-between">
          <span>{editingKey ? `Editing Word: "${editingKey}"` : 'Add New Translation Pair / إضافة كلمة جديدة'}</span>
          {editingKey && (
            <button
              type="button"
              onClick={() => {
                setEditingKey(null);
                setEnglishInput('');
                setArabicInput('');
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline font-normal"
            >
              Cancel Edit
            </button>
          )}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              English Word or Phrase (LTR):
            </label>
            <input
              type="text"
              required
              value={englishInput}
              onChange={(e) => setEnglishInput(e.target.value)}
              placeholder="e.g. Broasted Chicken, Milk, Burger..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1" dir="rtl">
              Arabic Translation / الترجمة بالعربية (RTL):
            </label>
            <input
              type="text"
              required
              value={arabicInput}
              onChange={(e) => setArabicInput(e.target.value)}
              placeholder="مثال: دجاج بروستد، حليب، برجر..."
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-sans text-right"
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {editingKey ? 'Update Translation / تحديث الترجمة' : 'Add to Dictionary / إضافة للقاموس'}
          </button>
        </div>
      </form>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search words in dictionary... / ابحث في القاموس"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 font-sans"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1 font-bold rounded-lg transition-all ${
              filterType === 'ALL' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalWords})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('BUILTIN')}
            className={`px-3 py-1 font-bold rounded-lg transition-all ${
              filterType === 'BUILTIN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Built-in ({builtinCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('CUSTOM')}
            className={`px-3 py-1 font-bold rounded-lg transition-all ${
              filterType === 'CUSTOM' ? 'bg-amber-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Custom User Entries
          </button>
        </div>
      </div>

      {/* Translation Dictionary Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
              <th className="p-3">English Word / Term</th>
              <th className="p-3 text-right">Arabic Translation</th>
              <th className="p-3 text-center">Type</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredKeys.map((key) => {
              const arabicVal = dictionary[key];
              const isCustom = !DEFAULT_TRANSLATION_DICTIONARY[key] || DEFAULT_TRANSLATION_DICTIONARY[key] !== arabicVal;

              return (
                <tr key={key} className="hover:bg-slate-50 transition-all">
                  <td className="p-3 font-bold text-slate-900 capitalize font-sans">{key}</td>
                  <td className="p-3 text-right font-extrabold text-indigo-900 font-sans text-sm" dir="rtl">
                    {arabicVal}
                  </td>
                  <td className="p-3 text-center">
                    {isCustom ? (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                        Custom
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Built-in
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1 rtl:space-x-reverse">
                    <button
                      type="button"
                      onClick={() => handleEdit(key)}
                      className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                      title="Edit Translation"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(key)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete Translation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredKeys.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No translation words found matching "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
};
