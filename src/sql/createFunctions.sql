CREATE FUNCTION IF NOT EXISTS extract_set_code (riot_id VARCHAR(255))
RETURNS VARCHAR(8) DETERMINISTIC
RETURN SUBSTRING_INDEX(riot_id, '-', 1);

-- We use locate here to filter out ids without a denominator (ex. VEN-R01)
CREATE FUNCTION IF NOT EXISTS extract_count_denom (riot_id VARCHAR(255))
RETURNS SMALLINT UNSIGNED
DETERMINISTIC
BEGIN
	DECLARE v_separator_pos INT;
	SET v_separator_pos = LOCATE('/', riot_id);
	IF v_separator_pos = 0 THEN
		RETURN NULL;
	END IF;
	RETURN CAST(SUBSTRING(riot_id, v_separator_pos + 1) AS UNSIGNED);
END;

CREATE FUNCTION IF NOT EXISTS get_collector_part (riot_id VARCHAR(255))
RETURNS VARCHAR(32) DETERMINISTIC
RETURN SUBSTRING_INDEX(SUBSTRING_INDEX(riot_id, '-', -1), '/', 1);

CREATE FUNCTION IF NOT EXISTS is_main_set_card (riot_id VARCHAR(255))
RETURNS BOOLEAN DETERMINISTIC
RETURN get_collector_part(riot_id) REGEXP '^[0-9]+[a*]?$';