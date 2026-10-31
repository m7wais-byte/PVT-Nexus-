"""Generate tests/reference/gas-reference.json — independent physical reference values for the
gas part of the PVT Calculator.

Source: CoolProp (http://www.coolprop.org), HEOS backend. Pure fluids use their reference
equations of state (e.g. Setzmann & Wagner for methane); mixtures use the GERG-2008 mixing
model (Kunz & Wagner 2012, J. Chem. Eng. Data 57, 3032), the basis of ISO 20765-2.
Methane viscosity: CoolProp's reference viscosity correlation for methane.

These are NOT petroleum correlations: they are the independent physical truth the correlation
chain (pseudo-criticals -> sour correction -> Z -> rho, Bg, cg; LGE viscosity) is checked against.

    python -m venv venv && venv/bin/pip install CoolProp
    venv/bin/python tests/reference/generate_gas_reference.py
"""
import json, datetime, os
import CoolProp
import CoolProp.CoolProp as CP

PSI = 6894.757293168          # Pa per psi
LBFT3 = 16.01846337           # kg/m3 per lbm/ft3
def tk(f): return (f - 32.0) * 5.0 / 9.0 + 273.15

GASES = {
    'sweet': {'Methane': 0.90, 'Ethane': 0.05, 'Propane': 0.02, 'n-Butane': 0.01, 'Nitrogen': 0.01, 'CarbonDioxide': 0.01},
    'sour':  {'Methane': 0.70, 'Ethane': 0.05, 'Propane': 0.02, 'CarbonDioxide': 0.10, 'HydrogenSulfide': 0.13},
}
GRID_T = [100.0, 200.0, 300.0]                 # degF
GRID_P = [500.0, 1500.0, 3000.0, 5000.0]       # psia (GERG-2008 normal range: up to 35 MPa = 5076 psia)

out = {'source': 'CoolProp %s (git %s), HEOS backend: pure-fluid reference EOS + GERG-2008 mixing'
                 % (CoolProp.__version__, CoolProp.__gitrevision__),
       'generated': datetime.date.today().isoformat(), 'units': {'p': 'psia', 'T': 'degF', 'rho': 'lbm/ft3', 'cg': '1/psi', 'mu': 'cP'},
       'gases': {}, 'methane_viscosity': []}
for name, comp in GASES.items():
    st = CP.AbstractState('HEOS', '&'.join(comp))
    st.set_mole_fractions(list(comp.values()))
    rows = []
    for tf in GRID_T:
        for p in GRID_P:
            st.update(CP.PT_INPUTS, p * PSI, tk(tf))
            rho = st.rhomass() / LBFT3
            cg = st.first_partial_deriv(CP.iDmolar, CP.iP, CP.iT) / st.rhomolar() * PSI   # (1/rho)(drho/dp)_T
            rows.append({'T': tf, 'p': p, 'Z': round(st.compressibility_factor(), 6), 'rho': round(rho, 6), 'cg': float('%.6e' % cg)})
    out['gases'][name] = {'composition': comp, 'molar_mass': round(st.molar_mass() * 1000, 5), 'points': rows}
for tf in GRID_T:
    for p in GRID_P:
        out['methane_viscosity'].append({'T': tf, 'p': p,
            'mu': round(CP.PropsSI('V', 'T', tk(tf), 'P', p * PSI, 'Methane') * 1000, 7),
            'Z': round(CP.PropsSI('Z', 'T', tk(tf), 'P', p * PSI, 'Methane'), 6)})
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gas-reference.json')
with open(path, 'w') as f:
    json.dump(out, f, indent=1)
print('wrote', path)
