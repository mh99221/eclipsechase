/**
 * Mock for #supabase/server used by API route tests.
 *
 * The vitest alias maps #supabase/server to this file.
 * The function checks event.context._supabaseServiceRole (set via createTestEvent)
 * and returns the mock Supabase client.
 */

let _mockClient: any = {}

export function _setMockClient(client: any) {
  _mockClient = client
}

export async function serverSupabaseServiceRole(_event: any) {
  if (_event?.context?._supabaseServiceRole) {
    return _event.context._supabaseServiceRole
  }
  return _mockClient
}

export async function serverSupabaseClient(_event: any) {
  if (_event?.context?._supabaseServiceRole) {
    return _event.context._supabaseServiceRole
  }
  return _mockClient
}

export function serverSupabaseUser() {
  return null
}

export function serverSupabaseSession() {
  return null
}
