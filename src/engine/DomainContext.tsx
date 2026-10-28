import React, { createContext, useContext, useState, useEffect } from 'react';
import { DOMAIN_PRESETS, type DomainId, type DomainPreset } from './domainPresets';
import { db } from '../db/schema';

export interface DomainContextType {
  activeDomainId: DomainId;
  activePreset: DomainPreset;
  setDomain: (domainId: DomainId) => Promise<void>;
  documentHead: {
    id: string;
    rev: string;
    data: Record<string, any>;
  };
  refreshDocumentHead: () => Promise<void>;
}

export const DomainContext = createContext<DomainContextType>({
  activeDomainId: 'disaster_relief',
  activePreset: DOMAIN_PRESETS.disaster_relief,
  setDomain: async () => {},
  documentHead: DOMAIN_PRESETS.disaster_relief.baselineDocument,
  refreshDocumentHead: async () => {}
});

export const useDomain = () => useContext(DomainContext);

export const DomainProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDomainId, setActiveDomainId] = useState<DomainId>('disaster_relief');
  const activePreset = DOMAIN_PRESETS[activeDomainId];

  const [documentHead, setDocumentHead] = useState<{
    id: string;
    rev: string;
    data: Record<string, any>;
  }>(activePreset.baselineDocument);

  const refreshDocumentHead = async () => {
    try {
      const stored = await db.patients.get(activePreset.documentId);
      if (stored) {
        setDocumentHead({
          id: stored.id,
          rev: stored.rev,
          data: {
            ...stored,
            ...(stored.notes ? { field_notes: stored.notes } : {})
          }
        });
      } else {
        setDocumentHead(activePreset.baselineDocument);
      }
    } catch {
      setDocumentHead(activePreset.baselineDocument);
    }
  };

  const setDomain = async (domainId: DomainId) => {
    setActiveDomainId(domainId);
    const newPreset = DOMAIN_PRESETS[domainId];

    // Seed/Switch Dexie database to match domain target document
    try {
      const existing = await db.patients.get(newPreset.documentId);
      if (!existing) {
        await db.patients.put({
          id: newPreset.documentId,
          rev: newPreset.baselineDocument.rev,
          name: newPreset.baselineDocument.data.patient_name || newPreset.baselineDocument.data.sector_quadrant || newPreset.baselineDocument.data.transformer_unit_id || newPreset.documentId,
          age: 0,
          village: newPreset.name,
          vaccine_status: 'Pending',
          batch_no: '',
          notes: newPreset.baselineDocument.data.field_notes || 'Baseline document initialized',
          updated_at: new Date().toISOString()
        });
      }
      await refreshDocumentHead();
    } catch (e) {
      console.warn('Domain switch storage sync:', e);
    }
  };

  useEffect(() => {
    refreshDocumentHead();
  }, [activeDomainId]);

  return (
    <DomainContext.Provider
      value={{
        activeDomainId,
        activePreset,
        setDomain,
        documentHead,
        refreshDocumentHead
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};
