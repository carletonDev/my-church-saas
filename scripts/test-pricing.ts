/**
 * Pricing Logic Test Suite
 * 
 * Run with: npx tsx scripts/test-pricing.ts
 * Or with Node: node scripts/test-pricing.js (after compiling)
 */

import {
  FLAT_FEE_CENTS,
  FREE_SEATS_THRESHOLD,
  PRICING_TIERS,
  getPricingTier,
  calculateTotalCost,
  calculateVariableCost,
  formatPrice,
  getStripePriceIds,
  getStripeSubscriptionItems,
  STRIPE_PRICE_IDS,
} from '../lib/stripe/config';

// Test colors
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';

function pass(message: string) {
  console.log(`${GREEN}✅ PASS${RESET} ${message}`);
}

function fail(message: string, expected: any, actual: any) {
  console.log(`${RED}❌ FAIL${RESET} ${message}`);
  console.log(`   Expected: ${expected}`);
  console.log(`   Actual:   ${actual}`);
}

function section(title: string) {
  console.log(`\n${BLUE}${'='.repeat(60)}${RESET}`);
  console.log(`${BLUE}${title}${RESET}`);
  console.log(`${BLUE}${'='.repeat(60)}${RESET}\n`);
}

// Test suite
function runTests() {
  console.log(`${YELLOW}Starting Pricing Logic Tests...${RESET}\n`);
  
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function test(name: string, expected: any, actual: any) {
    totalTests++;
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
      pass(name);
      passedTests++;
    } else {
      fail(name, expected, actual);
      failedTests++;
    }
  }

  // ===================================================================
  // Test 1: Constants
  // ===================================================================
  section('1. Constants Validation');
  
  test('FLAT_FEE_CENTS should be 1999 ($19.99)', 1999, FLAT_FEE_CENTS);
  test('FREE_SEATS_THRESHOLD should be 50', 50, FREE_SEATS_THRESHOLD);
  test('PRICING_TIERS should have 4 tiers', 4, PRICING_TIERS.length);

  // ===================================================================
  // Test 2: Pricing Tiers
  // ===================================================================
  section('2. Pricing Tiers Configuration');

  test('Freemium tier: 1-50 seats at $0/seat', 
    { minSeats: 1, maxSeats: 50, pricePerPaidSeat: 0, label: 'Freemium' },
    PRICING_TIERS[0]
  );

  test('Growth tier: 51-75 seats at $9.99/seat',
    { minSeats: 51, maxSeats: 75, pricePerPaidSeat: 999, label: 'Growth' },
    PRICING_TIERS[1]
  );

  test('Thrive tier: 76-200 seats at $7.99/seat',
    { minSeats: 76, maxSeats: 200, pricePerPaidSeat: 799, label: 'Thrive' },
    PRICING_TIERS[2]
  );

  test('Enterprise tier: 201+ seats at $5.99/seat',
    { minSeats: 201, maxSeats: null, pricePerPaidSeat: 599, label: 'Enterprise' },
    PRICING_TIERS[3]
  );

  // ===================================================================
  // Test 3: Get Pricing Tier
  // ===================================================================
  section('3. getPricingTier() Function');

  test('25 seats → Freemium tier', 'Freemium', getPricingTier(25).label);
  test('50 seats → Freemium tier', 'Freemium', getPricingTier(50).label);
  test('51 seats → Growth tier', 'Growth', getPricingTier(51).label);
  test('60 seats → Growth tier', 'Growth', getPricingTier(60).label);
  test('75 seats → Growth tier', 'Growth', getPricingTier(75).label);
  test('76 seats → Thrive tier', 'Thrive', getPricingTier(76).label);
  test('100 seats → Thrive tier', 'Thrive', getPricingTier(100).label);
  test('200 seats → Thrive tier', 'Thrive', getPricingTier(200).label);
  test('201 seats → Enterprise tier', 'Enterprise', getPricingTier(201).label);
  test('500 seats → Enterprise tier', 'Enterprise', getPricingTier(500).label);

  // ===================================================================
  // Test 4: Calculate Total Cost
  // ===================================================================
  section('4. calculateTotalCost() Function');

  // Freemium tier (0 paid seats)
  test('25 seats: $19.99 flat fee only', 1999, calculateTotalCost(25));
  test('50 seats: $19.99 flat fee only', 1999, calculateTotalCost(50));

  // Growth tier (51-75 seats at $9.99/seat above 50)
  test('51 seats: $19.99 + (1 × $9.99) = $29.98', 2998, calculateTotalCost(51));
  test('60 seats: $19.99 + (10 × $9.99) = $119.89', 11989, calculateTotalCost(60));
  test('75 seats: $19.99 + (25 × $9.99) = $269.74', 26974, calculateTotalCost(75));

  // Thrive tier (76-200 seats at $7.99/seat above 50)
  test('76 seats: $19.99 + (26 × $7.99) = $227.73', 22773, calculateTotalCost(76));
  test('100 seats: $19.99 + (50 × $7.99) = $419.49', 41949, calculateTotalCost(100));
  test('200 seats: $19.99 + (150 × $7.99) = $1,218.49', 121849, calculateTotalCost(200));

  // Enterprise tier (201+ seats at $5.99/seat above 50)
  test('201 seats: $19.99 + (151 × $5.99) = $924.48', 92448, calculateTotalCost(201));
  test('250 seats: $19.99 + (200 × $5.99) = $1,217.99', 121799, calculateTotalCost(250));
  test('500 seats: $19.99 + (450 × $5.99) = $2,715.49', 271549, calculateTotalCost(500));

  // ===================================================================
  // Test 5: Calculate Variable Cost
  // ===================================================================
  section('5. calculateVariableCost() Function');

  test('25 seats: $0 variable cost', 0, calculateVariableCost(25));
  test('50 seats: $0 variable cost', 0, calculateVariableCost(50));
  test('60 seats: 10 × $9.99 = $99.90', 9990, calculateVariableCost(60));
  test('100 seats: 50 × $7.99 = $399.50', 39950, calculateVariableCost(100));
  test('250 seats: 200 × $5.99 = $1,198', 119800, calculateVariableCost(250));

  // ===================================================================
  // Test 6: Format Price
  // ===================================================================
  section('6. formatPrice() Function');

  test('1999 cents → "$19.99"', '$19.99', formatPrice(1999));
  test('999 cents → "$9.99"', '$9.99', formatPrice(999));
  test('799 cents → "$7.99"', '$7.99', formatPrice(799));
  test('599 cents → "$5.99"', '$5.99', formatPrice(599));
  test('11989 cents → "$119.89"', '$119.89', formatPrice(11989));

  // ===================================================================
  // Test 7: Get Stripe Price IDs
  // ===================================================================
  section('7. getStripePriceIds() Function');

  // Mock Price IDs for testing
  const mockBaseId = 'price_base_fee_123';
  const mockGrowthId = 'price_growth_123';
  const mockThriveId = 'price_thrive_123';
  const mockEnterpriseId = 'price_enterprise_123';

  // Note: This test assumes the environment variables are set
  // In real scenario, you'd mock these or set them in test env
  console.log('⚠️  Note: Price ID tests require environment variables to be set\n');

  const testWithMockIds = (seats: number, expectedCount: number, expectedTier?: string) => {
    const ids = getStripePriceIds(seats);
    test(
      `${seats} seats → ${expectedCount} price ID(s)${expectedTier ? ` (includes ${expectedTier})` : ''}`,
      expectedCount,
      ids.length
    );
    
    // Always includes BASE_FEE
    if (ids.length > 0) {
      test(`${seats} seats → First ID should be BASE_FEE`, true, ids[0] === STRIPE_PRICE_IDS.BASE_FEE);
    }
  };

  testWithMockIds(25, 1); // Only BASE_FEE
  testWithMockIds(50, 1); // Only BASE_FEE
  testWithMockIds(60, 2, 'GROWTH'); // BASE_FEE + GROWTH
  testWithMockIds(100, 2, 'THRIVE'); // BASE_FEE + THRIVE
  testWithMockIds(250, 2, 'ENTERPRISE'); // BASE_FEE + ENTERPRISE

  // ===================================================================
  // Test 8: Get Stripe Subscription Items
  // ===================================================================
  section('8. getStripeSubscriptionItems() Function');

  const testSubscriptionItems = (seats: number, expectedItems: number, expectedPaidSeats?: number) => {
    const items = getStripeSubscriptionItems(seats);
    test(
      `${seats} seats → ${expectedItems} subscription item(s)`,
      expectedItems,
      items.length
    );

    // BASE_FEE should always have quantity 1
    if (items.length > 0) {
      test(`${seats} seats → BASE_FEE quantity is 1`, 1, items[0].quantity);
    }

    // Check paid seats quantity if provided
    if (expectedPaidSeats !== undefined && items.length > 1) {
      test(
        `${seats} seats → Tiered price quantity is ${expectedPaidSeats}`,
        expectedPaidSeats,
        items[1].quantity
      );
    }
  };

  testSubscriptionItems(25, 1); // Only BASE_FEE
  testSubscriptionItems(50, 1); // Only BASE_FEE
  testSubscriptionItems(60, 2, 10); // BASE_FEE + GROWTH (10 paid seats)
  testSubscriptionItems(75, 2, 25); // BASE_FEE + GROWTH (25 paid seats)
  testSubscriptionItems(100, 2, 50); // BASE_FEE + THRIVE (50 paid seats)
  testSubscriptionItems(250, 2, 200); // BASE_FEE + ENTERPRISE (200 paid seats)

  // ===================================================================
  // Test 9: Tier Boundary Transitions
  // ===================================================================
  section('9. Tier Boundary Transitions');

  // 50 → 51 (Freemium to Growth)
  const cost50 = calculateTotalCost(50);
  const cost51 = calculateTotalCost(51);
  test('50 seats costs $19.99', 1999, cost50);
  test('51 seats costs $29.98', 2998, cost51);
  test('Adding 1st paid seat increases cost by $9.99', 999, cost51 - cost50);

  // 75 → 76 (Growth to Thrive)
  const cost75 = calculateTotalCost(75);
  const cost76 = calculateTotalCost(76);
  test('75 seats (Growth) costs $269.74', 26974, cost75);
  test('76 seats (Thrive) costs $227.73', 22773, cost76);
  test('Growth→Thrive transition REDUCES cost by $41.01', -4201, cost76 - cost75);

  // 200 → 201 (Thrive to Enterprise)
  const cost200 = calculateTotalCost(200);
  const cost201 = calculateTotalCost(201);
  test('200 seats (Thrive) costs $1,218.49', 121849, cost200);
  test('201 seats (Enterprise) costs $924.48', 92448, cost201);
  test('Thrive→Enterprise transition REDUCES cost by $294.01', -29401, cost201 - cost200);

  // ===================================================================
  // Test Summary
  // ===================================================================
  section('Test Summary');

  console.log(`Total Tests:  ${totalTests}`);
  console.log(`${GREEN}Passed:       ${passedTests}${RESET}`);
  console.log(`${failedTests > 0 ? RED : GREEN}Failed:       ${failedTests}${RESET}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  if (failedTests === 0) {
    console.log(`${GREEN}🎉 All tests passed!${RESET}\n`);
  } else {
    console.log(`${RED}❌ ${failedTests} test(s) failed. Please review.${RESET}\n`);
    process.exit(1);
  }
}

// Run the tests
runTests();
