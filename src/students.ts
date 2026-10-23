import AsyncStorage from '@react-native-async-storage/async-storage';
export type Student = { id: string; name: string; code: string; email: string; avatar: string };
const KEY = '@students/v1';
export const blank = (): Student => ({ id: '', name: '', code: '', email: '', avatar: '' });
export async function loadStudents(): Promise<Student[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const data = raw ? JSON.parse(raw) : [];
  if (!Array.isArray(data) || !data.every(x => x && ['id', 'name', 'code', 'email', 'avatar'].every(k => typeof x[k] === 'string'))) throw Error('Invalid student data');
  return data;
}
export const storeStudents = (students: Student[]) => AsyncStorage.setItem(KEY, JSON.stringify(students));
export function validate(student: Student, students: Student[]) {
  if (!student.name || !student.code || !student.email) return 'required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) return 'invalidEmail';
  if (students.some(x => x.id !== student.id && x.code.toLowerCase() === student.code.toLowerCase())) return 'duplicate';
  if (student.avatar && !/^(https?:\/\/|file:\/\/|content:\/\/|data:image\/|blob:)/i.test(student.avatar)) return 'invalidAvatar';
  return null;
}
