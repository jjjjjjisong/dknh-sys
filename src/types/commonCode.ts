export type CommonCodeGroup = 'RECEIVER';

export type CommonCode = {
  groupCode: CommonCodeGroup;
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
  note: string;
  delYn: 'Y' | 'N';
  updatedAt: string | null;
  updatedBy: string;
};

export type CommonCodeInput = {
  label: string;
  sortOrder: number;
  active: boolean;
  note: string;
};
