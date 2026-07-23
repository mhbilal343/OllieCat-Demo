pub struct MatchResult {
    pub index_a: u32,
    pub index_b: u32,
    pub separation_arcsec: f64,
}

pub fn crossmatch(
    ra_a: &[f64], dec_a: &[f64],
    ra_b: &[f64], dec_b: &[f64],
    radius_arcsec: f64,
) -> Vec<MatchResult> {
    let mut results = Vec::new();

    // NOTE: naive O(n*m) version first — correctness before speed.
    for (i, (&ra1, &dec1)) in ra_a.iter().zip(dec_a.iter()).enumerate() {
        for (j, (&ra2, &dec2)) in ra_b.iter().zip(dec_b.iter()).enumerate() {
            let sep = angular_separation_arcsec(ra1, dec1, ra2, dec2);
            if sep <= radius_arcsec {
                results.push(MatchResult {
                    index_a: i as u32,
                    index_b: j as u32,
                    separation_arcsec: sep,
                });
            }
        }
    }

    results
}

fn angular_separation_arcsec(ra1: f64, dec1: f64, ra2: f64, dec2: f64) -> f64 {
    let ra1_rad = ra1.to_radians();
    let dec1_rad = dec1.to_radians();
    let ra2_rad = ra2.to_radians();
    let dec2_rad = dec2.to_radians();

    let d_ra = ra2_rad - ra1_rad;
    let cos_sep = dec1_rad.sin() * dec2_rad.sin()
        + dec1_rad.cos() * dec2_rad.cos() * d_ra.cos();
    let sep_rad = cos_sep.clamp(-1.0, 1.0).acos();
    sep_rad.to_degrees() * 3600.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_an_obvious_match() {
        let ra_a = vec![10.0];
        let dec_a = vec![20.0];
        let ra_b = vec![10.0001];
        let dec_b = vec![20.0001];

        let matches = crossmatch(&ra_a, &dec_a, &ra_b, &dec_b, 5.0);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].index_a, 0);
        assert_eq!(matches[0].index_b, 0);
    }

    #[test]
    fn rejects_an_obvious_non_match() {
        let ra_a = vec![10.0];
        let dec_a = vec![20.0];
        let ra_b = vec![200.0];
        let dec_b = vec![-40.0];

        let matches = crossmatch(&ra_a, &dec_a, &ra_b, &dec_b, 5.0);
        assert_eq!(matches.len(), 0);
    }
}