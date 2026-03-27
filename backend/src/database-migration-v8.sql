-- v8: distinguir vendas à vista de vendas fiado (a receber)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS fiado BOOLEAN DEFAULT FALSE;
