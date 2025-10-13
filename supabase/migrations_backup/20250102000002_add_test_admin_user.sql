-- Add test admin user to users table
INSERT INTO users (id, tenant_id, email, name, role_code, phone)
VALUES (
  'a0671700-adce-4b0c-9924-58847b1e09b9',
  'a0000000-0000-0000-0000-000000000001',
  'admin@test.acadesk.com',
  '테스트 관리자',
  'admin',
  '010-0000-0000'
)
ON CONFLICT (id) DO NOTHING;
