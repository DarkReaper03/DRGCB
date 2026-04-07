// =============================================
// Module: linkWatcher
// Core phishing link detection logic.
// Uses Levenshtein distance to catch lookalike
// domains, plus stop-discord-phishing blocklist.
// (Ported directly from DC Link Watcher validate.js)
// =============================================

const levenshtein = require('js-levenshtein');

const allowed_domains = require('../data/allowed_domains.json').map(d => d.split('.').reverse());
const flairs = require('../data/flairs.json');

// --- Heap's Algorithm: generate all permutations of an array ---
function permutator(array) {
	let permutation = array.slice();
	const length = array.length;
	const result = [array.slice()];
	const count = new Array(length).fill(0);
	let i = 1;

	while (i < length) {
		if (count[i] < i) {
			const k = i % 2 && count[i];
			const tmp = permutation[i];
			permutation[i] = permutation[k];
			permutation[k] = tmp;
			count[i]++;
			i = 1;
			result.push(permutation.slice());
		} else {
			count[i] = 0;
			i++;
		}
	}
	return result;
}

// Cache permutations per unique array to avoid recomputing
const permCache = new Map();
function cachedPermutator(array) {
	const key = array.join(',');
	if (permCache.has(key)) return permCache.get(key);
	const result = permutator(array);
	permCache.set(key, result);
	return result;
}

// Check if a domain matches a flair using Levenshtein distance
function checkDomain(domain, flair) {
	const distance = flair.distance ?? 0;
	const parts = domain.split('.').reverse();

	function match(ngram) {
		if (typeof flair.domain === 'string') {
			return levenshtein(ngram, flair.domain) <= distance;
		} else if (Array.isArray(flair.domain)) {
			for (const perm of cachedPermutator(flair.domain)) {
				if (levenshtein(ngram, perm.join('')) <= distance) return true;
			}
		}
		return false;
	}

	// Check each individual part
	for (const part of parts) {
		if (match(part)) return false;
	}

	// Check 2-grams (adjacent pairs)
	for (let n = 0; n < parts.length - 1; n++) {
		for (const perm of permutator([parts[n], parts[n + 1]])) {
			if (match(perm.join('.'))) return false;
		}
	}

	return true; // Passed — domain looks legit
}

// Check if domain is in the explicit allowlist
function isAllowedDomain(domain) {
	const parts = domain.toLowerCase().split('.').reverse();
	for (const allowed of allowed_domains) {
		let ok = true;
		for (let i = 0; i < allowed.length; i++) {
			if (allowed[i] !== parts[i]) { ok = false; break; }
		}
		if (ok) return true;
	}
	return false;
}

// Run a single flair check against a link
function checkFlair(link, flair) {
	if (flair.domain) {
		const domain = (link.split('/').filter(Boolean)[0] || '').toLowerCase();
		if (!isAllowedDomain(domain) && !checkDomain(domain, flair)) return false;
	}
	return true;
}

// Check if a single URL is suspicious
function validate(link) {
	for (const flair of flairs) {
		if (!checkFlair(link, flair)) return false;
	}
	return true;
}

// Scan a full message string for phishing links
// Returns [isBad: boolean, reason: string]
const validate_message = module.exports.validate_message = async function(content) {
	// Neutralize discord.gift before passing to stop-phishing (known false positive)
	content = content.replace(/\bdiscord\.gift\b(?![\.\-_?])/g, 'discord.com');

	// Crude URL regex — matches a superset, fine for scanning
	const urlRegex = /\w+:\/\/(\S+)/g;
	let match;
	while ((match = urlRegex.exec(content)) !== null) {
		if (!validate(match[1])) {
			return [true, `Levenshtein(${match[0]})`];
		}
	}

	return [false, ''];
};

module.exports.validate = validate;
