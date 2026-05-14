'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_URL = 'https://owdvtgwuizxzgppqgtps.supabase.co';
const ADMIN_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93ZHZ0Z3d1aXp4emdwcHFndHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyODU5MDMsImV4cCI6MjA5Mjg2MTkwM30.hpNlm2eUX_zAgYF7Lud9Ru2QSJuHvYaR4EB-Lf9a-4A';

const PLAN_FEATURES: Record<string, Record<string, boolean>> = {
  starter:     { aiScoring:false, ownerSearch:false, analytics:false, addLead:false, exportFull:false, hubspot:false, revpar:false },
  growth:      { aiScoring:true,  ownerSearch:false, analytics:true,  addLead:true,  exportFull:true,  hubspot:false, revpar:true  },
  professional:{ aiScoring:true,  ownerSearch:true,  analytics:true,  addLead:true,  exportFull:true,  hubspot:true,  revpar:true  },
  custom:      { aiScoring:true,  ownerSearch:true,  analytics:true,  addLead:true,  exportFull:true,  hubspot:true,  revpar:true  },
  enterprise:  { aiScoring:true,  ownerSearch:true,  analytics:true,  addLead:true,  exportFull:true,  hubspot:true,  revpar:true  },
};

const h = { apikey: ADMIN_KEY, Authorization: `Bearer ${ADMIN_KEY}`, 'Content-Type': 'application/json' };

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);

    try {
      // 1. Authenticate with Supabase Auth
      const authRes = await fetch(`${ADMIN_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ email, password }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) throw new Error(authData.error_description || authData.msg || 'Credenciales incorrectas');

      // 2. Get routing from user_routing by email
      // user_routing columns: id, email, org_id, org_name, supabase_url, supabase_key
      const ouRes = await fetch(
        `${ADMIN_URL}/rest/v1/user_routing?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
        { headers: h }
      );
      const ouData = await ouRes.json();
      if (!ouData?.length) throw new Error('Usuario sin organización asignada');
      const routing = ouData[0];

      // 3. Get organization for plan + pipeline_config
      // organizations columns: id, name, plan, supabase_url, supabase_key, pipeline_config
      const orgRes = await fetch(
        `${ADMIN_URL}/rest/v1/organizations?id=eq.${routing.org_id}&select=*&limit=1`,
        { headers: h }
      );
      const orgs = await orgRes.json();
      const org  = orgs?.[0] || {};
      const plan = (org.plan || 'enterprise').toLowerCase();

      // 4. Build session — prefer user_routing credentials, fallback to organizations
      const session = {
        email,
        org_id:          routing.org_id,
        org_name:        routing.org_name || org.name || routing.org_id,
        supabase_url:    routing.supabase_url || org.supabase_url,
        supabase_key:    routing.supabase_key || org.supabase_key,
        plan,
        features:        PLAN_FEATURES[plan] || PLAN_FEATURES.enterprise,
        pipeline_config: org.pipeline_config || {},
        userPlan:        plan,
        isSapioraAdmin:  email === 'alex@sapiora.es',
      };

      sessionStorage.setItem('sapiora_session', JSON.stringify(session));
      router.push('/dashboard/pipeline');

    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a', fontFamily:'Montserrat, sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:420, boxShadow:'0 24px 64px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ fontSize:28, fontWeight:900, letterSpacing:4, color:'#0a0a0a' }}>
            SAPIORA<span style={{ color:'#C4A35A' }}>.</span>
          </div>
          <div style={{ fontSize:10, color:'#999', letterSpacing:3, marginTop:6, textTransform:'uppercase' }}>
            Hotel Lead Intelligence
          </div>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@email.com"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:14, outline:'none', fontFamily:'Montserrat, sans-serif' }}
              onFocus={e => e.target.style.borderColor='#C4A35A'} onBlur={e => e.target.style.borderColor='#e0e0e0'} />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={{ fontSize:10, fontWeight:700, color:'#666', textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width:'100%', padding:'10px 14px', borderRadius:8, border:'1px solid #e0e0e0', fontSize:14, outline:'none', fontFamily:'Montserrat, sans-serif' }}
              onFocus={e => e.target.style.borderColor='#C4A35A'} onBlur={e => e.target.style.borderColor='#e0e0e0'} />
          </div>
          {error && (
            <div style={{ background:'rgba(154,60,66,.1)', color:'#9a3c42', padding:'10px 14px', borderRadius:8, fontSize:12, marginBottom:16, fontWeight:600 }}>
              ⚠ {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:12, borderRadius:10, background:loading?'#ddd':'#C4A35A', color:loading?'#999':'#0a0a0a', border:'none', fontSize:12, fontWeight:800, letterSpacing:1.5, textTransform:'uppercase', cursor:loading?'default':'pointer', fontFamily:'Montserrat, sans-serif' }}>
            {loading ? 'Accediendo…' : 'Acceder →'}
          </button>
        </form>
        <div style={{ marginTop:24, textAlign:'center', fontSize:10, color:'#bbb', letterSpacing:1 }}>
          © 2026 Sapiora · Hotel Lead Intelligence
        </div>
      </div>
    </div>
  );
}
