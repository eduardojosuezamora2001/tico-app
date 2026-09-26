-- Leer un hilo depende de la conversación, no de haber sido destinatario
-- de un mensaje suelto. Así un empleado deja de ver el historial al cederlo.

drop policy if exists "messages: customer, assignee, or owner can read" on public.messages;
create policy "messages: customer, assignee, or owner can read"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (
          c.customer_id = (select auth.uid())
          or (
            c.assignee_id = (select auth.uid())
            and (select private.is_active_business_member(c.business_id))
          )
          or (select private.is_business_owner(c.business_id))
        )
    )
  );
