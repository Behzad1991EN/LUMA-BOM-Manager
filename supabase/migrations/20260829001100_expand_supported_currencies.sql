-- Expand selectable commercial currencies across Price Lists and Logistics.
-- GBP remains database-valid for historical records but is not offered for new UI selections.

alter table public.price_lists
  drop constraint price_lists_currency_allowed;

alter table public.price_lists
  add constraint price_lists_currency_allowed
  check (currency in ('EUR', 'USD', 'TRY', 'CNY', 'EGP', 'CHF', 'GBP'));

alter table public.logistics_rates
  drop constraint logistics_rates_currency_allowed;

alter table public.logistics_rates
  add constraint logistics_rates_currency_allowed
  check (currency in ('EUR', 'USD', 'TRY', 'CNY', 'EGP', 'CHF', 'GBP'));

comment on constraint price_lists_currency_allowed on public.price_lists is
  'Current UI currencies: EUR, USD, TRY, CNY, EGP, CHF. GBP remains valid for historical records.';

comment on constraint logistics_rates_currency_allowed on public.logistics_rates is
  'Current UI currencies: EUR, USD, TRY, CNY, EGP, CHF. GBP remains valid for historical records.';
