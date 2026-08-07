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
  password: z.string().min(6, 'Min. 6 caractères'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (err) setError(err.message);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>VLOGER</Text>
        <Text style={s.title}>Connexion</Text>
        <Text style={s.sub}>Content de te revoir.</Text>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Text style={s.label}>EMAIL</Text>
        <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
          <TextInput
            style={s.input} placeholder="ton@email.com" placeholderTextColor={COLORS.textMuted}
            value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address"
            autoComplete="email"
          />
        )} />
        {errors.email && <Text style={s.fieldError}>{errors.email.message}</Text>}

        <Text style={[s.label, { marginTop: SPACING.lg }]}>MOT DE PASSE</Text>
        <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
          <TextInput
            style={s.input} placeholder="••••••••" placeholderTextColor={COLORS.textMuted}
            value={value} onChangeText={onChange} secureTextEntry autoComplete="password"
          />
        )} />
        {errors.password && <Text style={s.fieldError}>{errors.password.message}</Text>}

        <TouchableOpacity style={s.btn} onPress={handleSubmit(onSubmit)} disabled={loading}>
          {loading
            ? <ActivityIndicator color={COLORS.black} size="small" />
            : <Text style={s.btnText}>SE CONNECTER</Text>}
        </TouchableOpacity>

        <View style={s.footer}>
          <Text style={s.footerText}>Pas encore de compte ? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity><Text style={s.link}>Créer un compte</Text></TouchableOpacity>
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
    borderWidth: 1, borderColor: '#5a1a1a', backgroundColor: '#1a0a0a',
    marginBottom: SPACING.lg,
  },
  btn: {
    backgroundColor: COLORS.gold, paddingVertical: SPACING.lg,
    alignItems: 'center', marginTop: SPACING.xxl,
  },
  btnText: { color: COLORS.black, fontSize: FONT.sizes.xs, letterSpacing: 4, fontWeight: FONT.medium },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xxl, paddingBottom: 40 },
  footerText: { color: COLORS.textDim, fontSize: FONT.sizes.xs },
  link: { color: COLORS.gold, fontSize: FONT.sizes.xs },
});
