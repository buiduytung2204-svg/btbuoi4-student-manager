import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Slot, router, usePathname } from 'expo-router';
import { ActivityIndicator, Alert, BackHandler, FlatList, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocales } from 'expo-localization';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { vi, en } from './src/i18n';
import { Student, blank, loadStudents, storeStudents, validate } from './src/students';

function Avatar({ student, large = false }: { student: Student; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [student.avatar]);
  return <View style={[s.avatar, large && s.large]}>{student.avatar && !failed ? <Image source={{ uri: student.avatar }} style={{ width: '100%', height: '100%' }} onError={() => setFailed(true)} accessibilityLabel={student.name} /> : <Text style={[s.initials, large && { fontSize: 34 }]}>{student.name.trim().split(/\s+/).map(x => x[0]).slice(-2).join('').toUpperCase() || 'SV'}</Text>}</View>;
}
function Button({ label, onPress, secondary = false, danger = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; danger?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, danger && s.danger, (pressed || disabled) && { opacity: .5 }]}><Text style={[s.buttonText, secondary && { color: '#294869' }, danger && { color: '#b42335' }]}>{label}</Text></Pressable>;
}
const ScreenContext = createContext<React.ReactNode>(null);
export function StudentScreen() { return useContext(ScreenContext); }
export default function App() { return <SafeAreaProvider><StudentApp /></SafeAreaProvider>; }
function StudentApp() {
  const locales = useLocales();
  const t = locales[0]?.languageCode === 'vi' ? vi : en;
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const pathname = usePathname();
  const screen = pathname === '/form' ? 'form' : pathname === '/detail' ? 'detail' : 'list';
  function setScreen(next: 'list' | 'detail' | 'form') { router.replace(next === 'list' ? '/' : next === 'detail' ? '/detail' : '/form'); }
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Student>(blank);
  const [original, setOriginal] = useState<Student>(blank);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<{ message: string; action: () => void } | null>(null);
  const student = students.find(x => x.id === selected);
  useEffect(() => { if (!loading && screen === 'detail' && !student) router.replace('/'); }, [loading, screen, student]);
  async function load() {
    setLoading(true); setLoadFailed(false);
    try { setStudents(await loadStudents()); } catch { setLoadFailed(true); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (Platform.OS === 'web') document.title = t.title; }, [t.title]);
  function back() {
    if (busy) return;
    const go = () => { setError(''); setScreen(screen === 'form' && draft.id ? 'detail' : 'list'); };
    if (screen === 'form' && JSON.stringify(draft) !== JSON.stringify(original)) setDialog({ message: t.discard, action: go }); else go();
  }
  useEffect(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (dialog) { setDialog(null); return true; } if (screen !== 'list') { back(); return true; } return false; }); return () => sub.remove(); }, [screen, draft, original, busy, dialog, t]);
  function openForm(value?: Student) { const next = value ? { ...value } : blank(); setDraft(next); setOriginal(next); setError(''); setScreen('form'); }
  async function commit(next: Student[], done: () => void) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { await storeStudents(next); setStudents(next); done(); }
    catch { Alert.alert(t.error, t.storageError); }
    finally { lock.current = false; setBusy(false); }
  }
  function save() {
    const value = { ...draft, name: draft.name.trim(), code: draft.code.trim(), email: draft.email.trim(), avatar: draft.avatar.trim() };
    const invalid = validate(value, students);
    if (invalid) return setError(t[invalid]);
    setError('');
    const action = () => {
      const saved = { ...value, id: value.id || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
      void commit(value.id ? students.map(x => x.id === value.id ? saved : x) : [...students, saved], () => { setSelected(saved.id); setScreen('detail'); });
    };
    if (value.id) setDialog({ message: t.confirmEdit, action }); else action();
  }
  async function pickPhoto() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      if (Platform.OS !== 'web') { const permission = await ImagePicker.requestMediaLibraryPermissionsAsync(); if (!permission.granted) { Alert.alert(t.error, t.permission); return; } }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .7, base64: Platform.OS === 'web' });
      if (!result.canceled) {
        const asset = result.assets[0];
        let uri = asset.uri;
        if (Platform.OS === 'web') { if (!asset.base64) throw Error('Missing image'); uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`; }
        else { const dest = new File(Paths.document, `avatar-${Date.now()}-${Math.random().toString(36).slice(2)}.${asset.fileName?.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg'}`); new File(uri).copy(dest); uri = dest.uri; }
        setDraft(current => ({ ...current, avatar: uri }));
      }
    } catch { Alert.alert(t.error, t.photoError); } finally { lock.current = false; setBusy(false); }
  }
  const filtered = students.filter(x => `${x.name} ${x.code} ${x.email}`.toLowerCase().includes(query.trim().toLowerCase()));
  const content = <SafeAreaView style={s.safe}><StatusBar style="dark" /><View style={s.container}>
    <View style={s.brand}><View style={s.logo}><Text style={s.logoText}>S</Text></View><View style={{ flex: 1 }}><Text style={s.title}>{t.title}</Text><Text style={s.subtitle}>{t.subtitle}</Text></View><Text style={s.code}>{t === vi ? 'VI' : 'EN'}</Text></View>
    {screen !== 'list' && <Pressable accessibilityRole="button" onPress={back} disabled={busy} style={s.back}><Text style={s.link}>‹  {t.back}</Text></Pressable>}
    {loading ? <View style={s.empty}><ActivityIndicator color="#2463eb" /><Text>{t.loading}</Text></View> : loadFailed ? <View style={s.empty}><Text style={s.error}>{t.loadError}</Text><Button label={t.retry} onPress={() => void load()} /></View> : screen === 'list' ? <>
      <View style={s.heading}><View><Text style={s.headingText}>{t.list}</Text><Text style={s.subtitle}>{students.length} {t.count}</Text></View><Button label={`+ ${t.add}`} onPress={() => openForm()} /></View>
      <TextInput accessibilityLabel={t.search} placeholder={t.search} placeholderTextColor="#7a899e" value={query} onChangeText={setQuery} style={s.search} />
      <FlatList data={filtered} keyExtractor={x => x.id} contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }} ListEmptyComponent={<View style={s.empty}><Text style={s.emptyIcon}>♧</Text><Text style={s.headingText}>{students.length ? t.noResults : t.empty}</Text>{!students.length && <Text style={s.subtitle}>{t.hint}</Text>}</View>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.name}, ${item.code}`} onPress={() => { setSelected(item.id); setScreen('detail'); }} style={({ pressed }) => [s.card, pressed && { opacity: .65 }]}><Avatar student={item} /><View style={{ flex: 1 }}><Text style={s.studentName}>{item.name}</Text><Text style={s.code}>{item.code}</Text><Text numberOfLines={1} style={s.subtitle}>{item.email}</Text></View><Text style={s.chevron}>›</Text></Pressable>} />
      <Text style={s.footer}>●  {t.local}</Text>
    </> : screen === 'detail' && student ? <ScrollView contentContainerStyle={s.panel}><View style={s.profile}><Avatar student={student} large /><Text style={s.profileName}>{student.name}</Text><Text style={s.badge}>{student.code}</Text></View><Text style={s.headingText}>{t.detail}</Text>{(['name', 'code', 'email'] as const).map(key => <View key={key} style={s.detailRow}><Text style={s.label}>{t[key]}</Text><Text selectable style={s.value}>{student[key]}</Text></View>)}<Button disabled={busy} label={t.edit} onPress={() => openForm(student)} /><Button disabled={busy} danger label={t.delete} onPress={() => setDialog({ message: t.confirmDelete, action: () => void commit(students.filter(x => x.id !== student.id), () => { setScreen('list'); setSelected(null); }) })} /></ScrollView> : <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.panel}><Text style={s.headingText}>{draft.id ? t.edit : t.add}</Text><View style={s.profile}><Avatar student={draft} large /><Button disabled={busy} secondary label={t.choose} onPress={() => void pickPhoto()} />{!!draft.avatar && <Pressable disabled={busy} accessibilityRole="button" onPress={() => setDraft({ ...draft, avatar: '' })}><Text style={s.link}>{t.remove}</Text></Pressable>}</View>{(['name', 'code', 'email', 'avatar'] as const).map(key => <View key={key} style={{ gap: 7 }}><Text style={s.label}>{t[key]} {key !== 'avatar' ? '*' : `(${t.optional})`}</Text><TextInput editable={!busy} accessibilityLabel={t[key]} value={key === 'avatar' && /^(file:|data:|blob:|content:)/.test(draft.avatar) ? '' : draft[key]} onChangeText={text => setDraft({ ...draft, [key]: text })} style={s.input} placeholder={key === 'avatar' ? 'https://…' : t[key]} placeholderTextColor="#8995a5" autoCapitalize={key === 'name' ? 'words' : 'none'} autoCorrect={key === 'name'} keyboardType={key === 'email' ? 'email-address' : key === 'avatar' ? 'url' : 'default'} maxLength={key === 'avatar' ? 2048 : 160} /></View>)}{!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}<Button disabled={busy} label={busy ? t.loading : t.save} onPress={save} /><Button disabled={busy} secondary label={t.cancel} onPress={back} /></ScrollView></KeyboardAvoidingView>}
    <Modal transparent visible={!!dialog} animationType="fade" onRequestClose={() => setDialog(null)}><View style={s.overlay}><View accessibilityViewIsModal style={s.dialog}><Text style={s.headingText}>{t.confirm}</Text><Text style={s.value}>{dialog?.message}</Text><View style={s.actions}><Button secondary label={t.no} onPress={() => setDialog(null)} /><Button label={t.yes} onPress={() => { const action = dialog?.action; setDialog(null); action?.(); }} /></View></View></View></Modal>
  </View></SafeAreaView>;
  return <ScreenContext.Provider value={content}><Slot /></ScreenContext.Provider>;
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f6fb' }, container: { flex: 1, width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24 }, logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2463eb', alignItems: 'center', justifyContent: 'center' }, logoText: { color: 'white', fontWeight: '800', fontSize: 26 }, title: { fontSize: 21, fontWeight: '800', color: '#172b4d' }, subtitle: { fontSize: 13, color: '#66768b', marginTop: 4 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingVertical: 16, flexWrap: 'wrap' }, headingText: { fontSize: 21, color: '#172b4d', fontWeight: '700' }, button: { backgroundColor: '#2463eb', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 17, alignItems: 'center', justifyContent: 'center', minHeight: 48 }, buttonText: { fontWeight: '700', color: '#fff', fontSize: 14 }, secondary: { backgroundColor: '#e9eff8' }, danger: { backgroundColor: '#fff0f1' },
  search: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dfe6ef', borderRadius: 13, padding: 15, marginBottom: 18, fontSize: 14, color: '#172b4d' }, card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'white', borderRadius: 16, marginBottom: 12, gap: 14, borderWidth: 1, borderColor: '#e7edf5' }, avatar: { width: 56, height: 56, borderRadius: 19, overflow: 'hidden', backgroundColor: '#e6efff', alignItems: 'center', justifyContent: 'center' }, large: { width: 112, height: 112, borderRadius: 34 }, initials: { fontSize: 20, fontWeight: '700', color: '#2463eb' }, studentName: { fontSize: 17, fontWeight: '700', color: '#172b4d' }, code: { fontSize: 12, fontWeight: '600', color: '#2463eb', marginTop: 5 }, chevron: { color: '#8c9bb0', fontSize: 30 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }, emptyIcon: { fontSize: 64, color: '#8aaaf2' }, footer: { textAlign: 'center', color: '#718099', fontSize: 12, paddingVertical: 16 }, back: { paddingVertical: 12, alignSelf: 'flex-start', minHeight: 44 }, link: { color: '#2463eb', fontWeight: '600', fontSize: 15 }, panel: { backgroundColor: '#fff', borderRadius: 20, padding: 22, gap: 18, paddingBottom: 36, marginBottom: 24 }, profile: { alignItems: 'center', gap: 14, paddingVertical: 16 }, profileName: { fontWeight: '800', fontSize: 25, color: '#172b4d', textAlign: 'center' }, badge: { color: '#2463eb', backgroundColor: '#eaf1ff', paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20, fontWeight: '600' }, detailRow: { gap: 7, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#edf0f5' }, label: { color: '#66768b', fontWeight: '600', fontSize: 13 }, value: { fontSize: 16, color: '#172b4d', lineHeight: 25 }, input: { borderWidth: 1, borderColor: '#dce3ee', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: '#172b4d', backgroundColor: '#fcfdff' }, error: { color: '#b42335', lineHeight: 23 }, overlay: { flex: 1, backgroundColor: '#10244288', justifyContent: 'center', alignItems: 'center', padding: 24 }, dialog: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 22, padding: 26, gap: 22 }, actions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
});
