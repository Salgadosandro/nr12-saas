--
-- Seed da matriz de risco (ADR 0003 — matriz dirigida por dados).
--
-- (probability, severity) -> risk_level. O app faz o lookup na gravação da NC
-- e GRAVA o risk_level no answer (snapshot: editar a matriz depois NÃO recalcula
-- NCs já gravadas — o laudo reflete a classificação vigente na inspeção).
--
-- Critério (confirmado com o engenheiro): score = gravidade x frequência (1..9),
-- faixas: 1-2 = low, 3-4 = medium, 6 = high, 9 = critical.
--   severity:    minor=1, moderate=2, major=3   (gravidade)
--   probability: low=1,   medium=2,   high=3     (frequência)
--
-- Idempotente: ON CONFLICT atualiza, então dá pra reaplicar à vontade.
--

insert into public.risk_matrix_rules (probability, severity, risk_level) values
  ('low',    'minor',    'low'),       -- 1x1 = 1
  ('medium', 'minor',    'low'),       -- 2x1 = 2
  ('high',   'minor',    'medium'),    -- 3x1 = 3
  ('low',    'moderate', 'low'),       -- 1x2 = 2
  ('medium', 'moderate', 'medium'),    -- 2x2 = 4
  ('high',   'moderate', 'high'),      -- 3x2 = 6
  ('low',    'major',    'medium'),    -- 1x3 = 3
  ('medium', 'major',    'high'),      -- 2x3 = 6
  ('high',   'major',    'critical')   -- 3x3 = 9
on conflict (probability, severity) do update
  set risk_level = excluded.risk_level;

-- Conferência: a matriz cobre as 9 combinações e reproduz o que estava no seed
-- da demo (high+major=critical, medium+major=high).
