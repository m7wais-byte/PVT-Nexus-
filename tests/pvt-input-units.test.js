const test = require('node:test');
const assert = require('node:assert/strict');
const U = require('../calc/pvt-units.js');
const E = require('../calc/pvt-engine.js');
const near = (a,b,t=1e-8) => assert.ok(Math.abs(a-b)<t, a+' != '+b);
test('every selectable input unit round-trips to the canonical basis',()=>{
  for(const [kind,units] of Object.entries(U.INPUT_UNITS)) for(const unit of units) {
    for(const v of [0,1,200,3000]) near(U.inputToCanon(kind,U.inputFromCanon(kind,v,unit),unit),v);
  }
});
test('absolute and gauge reference agree; increments never get an atmosphere offset',()=>{
  near(U.inputToCanon('p',101.325,'kPa(a)'),U.P_ATM_PSIA);
  near(U.inputToCanon('p',0,'kPa(g)'),U.P_ATM_PSIA);
  near(U.inputToCanon('p',0,'MPa(g)'),U.P_ATM_PSIA);
  near(U.inputToCanon('dp',100,'kPa'),U.PSI_PER_BAR);
  near(U.inputToCanon('p',1,'bar(g)')-U.inputToCanon('dp',1,'bar'),U.P_ATM_PSIA);
});
test('temperature and density conversions use the correct offsets and factors',()=>{
  near(U.inputToCanon('T',0,'°C'),32);
  near(U.inputToCanon('T',273.15,'K'),32);
  near(U.inputToCanon('T',491.67,'°R'),32);
  near(U.inputToCanon('density',1,'g/cm³'),1000/U.KGM3_PER_LBFT3);
  assert.ok(Number.isNaN(U.inputToCanon('p',10,'°C')));
});
test('mixed input units preserve oil and gas calculated results and pressure grids',()=>{
  for(const fluid of ['oil','gas']) {
    const inp=Object.assign({},E.example(fluid,'field'),{fluid,units:'field',gauge:false,calcMode:'range',oilChar:'pb'});
    const ref=E.run(inp);
    const mixed=Object.assign({},inp,{canon:{
      pMin:U.inputToCanon('p',U.inputFromCanon('p',200,'kPa(a)'),'kPa(a)'),
      pMax:U.inputToCanon('p',U.inputFromCanon('p',fluid==='oil'?5000:6000,'MPa(g)'),'MPa(g)'),
      pStep:U.inputToCanon('dp',U.inputFromCanon('dp',200,'kPa'),'kPa'),
      T:U.inputToCanon('T',U.inputFromCanon('T',200,'°C'),'°C'),
      pb:U.inputToCanon('p',U.inputFromCanon('p',2200,'bar(g)'),'bar(g)')
    }});
    const actual=E.run(mixed); assert.equal(actual.ok,true);assert.equal(ref.ok,true);
    assert.equal(actual.pressures.length,ref.pressures.length);
    actual.pressures.forEach((p,i)=>near(p,ref.pressures[i]));
    const key=fluid==='gas'?'z':'bo';
    actual.props[key].values.forEach((v,i)=>near(v,ref.props[key].values[i]));
  }
});
