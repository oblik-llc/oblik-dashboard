export interface CognitoUser {
  username: string;
  email: string;
  status: string;
  enabled: boolean;
  createdAt: string; // ISO 8601
  lastModifiedAt: string; // ISO 8601
  groups: string[];
}

export interface CognitoGroup {
  name: string;
  description: string | null;
}
