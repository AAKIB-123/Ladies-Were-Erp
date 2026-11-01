export type UserRole = 'admin' | 'staff';

export interface Location {
  _id: string;
  id?: string;
  name: string;
  code: string;
  address?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  assignedLocations: Location[] | string[];
  phone?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}
