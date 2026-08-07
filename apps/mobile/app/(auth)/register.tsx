import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING, FONT } from '../../src/lib/theme';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Min. 8 caractères'),
  username: z.string().min(3, 'Min. 3 caractères').regex(/^[a-z0-9_]+$/, 'Lettres, chiffres et _ uniquement'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    const { data: authData, error: err } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    if (authData.user) {
      try {
        await supabase.from('profiles').insert({
          user_id: authData.user.id,
          username: data.username,
          display_name: data.username,
          followers_count: 0, following_count: 0, posts_count: 0,
        });
      } catch {}
    }
    setDone(true);
    setLoading(false);
  };

  if (done) return (
    <View style={[s.root, { justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl }]}>
      <Text style={s.logo}>VLOGER</Text>
      <Text style={[s.title, { textAlign: 'center' }]}>Vérifie ton email.</Text>
      <Text style={[s.sub, { textAlign: 'center' }]}>Un lien de confirmation t'a été envoyé.</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>VLOGER</Text>
        <Text style={s.title}>Créer un compte.</Text>
        <Text style={s.sub}>Rejoins la communauté des créateurs.</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {([
          { name: 'email' as const, label: 'EMAIL', placeholder: 'ton@email.com', keyboard: 'email-address' as const, secure: false },
          { name: 'username' as const, label: 'PSEUDONYME', placeholder: 'mon_pseudo', keyboard: 'default' as const, secure: false },
          { name: 'password' as const, label: 'MOT DE PASSE', placeholder: 'Min. 8 caractères', keyboard: 'default' as const, secure: true },
        ]).map(({ name, label, placeholder, keyboard, secure }) => (
          <View key={name}>
            <Text style={[s.label, { marginTop: SPACING.lg }]}>{label}</Text>
            <Controller control={control} name={name} render={({ field: { onChange, value } }) => (
              <TextInput
                style={s.input} placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
                value={value} onChangeText={onChange} secureTextEntry={secure}
                keyboardType={keyboard} autoCapitalize="none"
              />
            )} />
            {errors[name] && <Text style={s.fieldError}>{errors[name]?.message}</Text>}
          </View>
        ))}

        <TouchableOpacity style={s.btn} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.black} size="small" />
            : <Text style={s.btnText}>CRÉER MON COMPTE</Text>}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Déjà un compte ? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity><Text style={s.link}>Se connecter</Text></TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  scroll: { flexGrow: 1, paddingHorizontal: SPACING.xxl, paddingTop: 80 },
  logo: { color: COLORS.gold, fontSize: FONT.sizes.xs, letterSpacing: 8, marginBottom: 48, fontWeight: FONT.light },
  title: { color: COLORS.white, fontSize: FONT.sizes.xxxl, fontWeight: FONT.light, marginBottom: 8 },
  sub: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, marginBottom: 40, letterSpacing: 1 },
  label: { color: COLORS.textMuted, fontSize: FONT.sizes.xs, letterSpacing: 2, marginBottom: 8 },
  input: {
    color: COLORS.white, fontSize: FONT.sizes.md, fontWeight: FONT.light,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: SPACING.md, marginBottom: 4,
  },
  fieldError: { color: COLORS.red, fontSize: FONT.sizes.xs, marginBottom: 8 },
  error: {
    color: COLORS.red, fontSize: FONT.sizes.xs, padding: SPACING.md,
    borderWidth: 1, borderColor: '#5a1a1a', backgroundColor: '#1a0a0a', marginBottom: SPACING.lg,
  },
  btn: { backgroundColor: COLORS.gold, paddingVertical: SPACING.lg, alignItems: 'center', marginTop: SPACING.xxl },
  btnText: { color: COLORS.black, fontSize: FONT.sizes.xs, letterSpacing: 4, fontWeight: FONT.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xxl, paddingBottom: 40 },
  footerText: { color: COLORS.textDim, fontSize: FONT.sizes.xs },
  link: { color: COLORS.gold, fontSize: FONT.sizes.xs },
});
