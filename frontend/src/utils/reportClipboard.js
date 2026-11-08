const clipboardFormat = 'cacoin/report';
const clipboardVersion = 1;

export const serializeReportClipboard = (report) =>
  JSON.stringify({
    format: clipboardFormat,
    version: clipboardVersion,
    report,
  });

export const parseReportClipboard = (text) => {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('A área de transferência não contém dados de um relatório.');
  }

  if (
    payload?.format !== clipboardFormat ||
    payload?.version !== clipboardVersion ||
    !payload.report ||
    typeof payload.report !== 'object' ||
    Array.isArray(payload.report)
  ) {
    throw new Error('Os dados copiados não são compatíveis com um relatório Cacoin.');
  }
  return payload.report;
};

export const normalizeReportAutomation = (automation) =>
  (Array.isArray(automation) ? automation : []).map((item) => ({
    ...item,
    serviceId: item.serviceId ?? item.service?.id,
  }));

export const prepareReportForNew = (report, company) => {
  const copied = { ...report };
  delete copied.id;
  delete copied.code;
  delete copied.createdAt;
  delete copied.updatedAt;
  delete copied.editableWithin24Hours;
  delete copied.folder;
  delete copied.folderId;
  return {
    ...copied,
    company,
    companyId: company.id,
    status: 'DRAFT',
    extraction: copied.extraction ?? copied.reportsExtraction ?? { extracted: false },
    browser: copied.browser ?? copied.browserStatus ?? {},
    cob: copied.cob ?? {},
    backup: copied.backup ?? {},
    dateVerification: copied.dateVerification ?? {},
    simo: copied.simo ?? {},
    stages: copied.stages ?? [],
    automation: normalizeReportAutomation(copied.automation),
  };
};
