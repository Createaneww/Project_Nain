import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from accounts.models import User
from screenings.models import Screening
from reports.models import Report
from referrals.models import Referral
from referrals.views import ReferralListView, ReferralClaimView, ReferralAssignDoctorView
from rest_framework.test import force_authenticate
import json

print("=== Starting NAIN AI Referral Flow Verification ===")

# 1. Fetch or create test doctors
doc1 = User.objects.filter(role=User.Role.DOCTOR).first()
if not doc1:
    print("No doctor found!")
    exit(1)
print(f"Doctor 1: {doc1.username} (id: {doc1.id})")

doc2 = User.objects.filter(role=User.Role.DOCTOR).exclude(id=doc1.id).first()
if not doc2:
    doc2 = User.objects.create_user(
        username="testdoc2",
        email="testdoc2@nain.ai",
        password="password123",
        role=User.Role.DOCTOR,
        first_name="Test",
        last_name="Doctor 2"
    )
print(f"Doctor 2: {doc2.username} (id: {doc2.id})")

admin_user = User.objects.filter(role=User.Role.ADMIN).first()
print(f"Admin: {admin_user.username} (id: {admin_user.id})")

# 2. Check existing referrals in database
print("\n--- Current Referrals in DB ---")
for r in Referral.objects.all().order_by('-id')[:10]:
    pred = r.report.prediction if r.report else "N/A"
    print(f"ID: {r.id}, Prediction: {pred}, Status: {r.status}, Assigned: {r.assigned_doctor_id} ({r.assigned_doctor.username if r.assigned_doctor else 'None'}), Available: {r.available_for_claim}")

# 3. Test ReferralListView for Doctor 1 with scope='available'
rf = RequestFactory()
request = rf.get('/api/referrals/?scope=available')
force_authenticate(request, user=doc1)
view = ReferralListView.as_view()
response = view(request)
print(f"\nDoctor 1 GET /api/referrals/?scope=available -> Status: {response.status_code}")
available_data = response.data
print(f"Available count: {len(available_data)}")
for item in available_data:
    print(f"  - Ref #{item['id']}: {item.get('prediction')}, Priority: {item.get('priority')}, Conf: {item.get('confidence')}, Assigned: {item.get('assigned_doctor')}, Avail: {item.get('available_for_claim')}")
    assert item['assigned_doctor'] is None, f"Expected unassigned, got {item['assigned_doctor']}"
    assert item['available_for_claim'] is True, "Expected available_for_claim=True"
    assert "no dr" not in str(item.get('prediction', '')).lower(), "No DR must not appear"

# 4. Test Claiming a Referral
# Find or create a test pending unassigned referral
test_ref = Referral.objects.filter(assigned_doctor__isnull=True, status="PENDING").exclude(report__prediction__icontains="No DR").first()
if not test_ref:
    # Find or create a report that has no referral
    rep = Report.objects.filter(referral__isnull=True).exclude(prediction__icontains="No DR").first()
    if not rep:
        from patients.models import Patient
        p = Patient.objects.first()
        sc = Screening.objects.create(patient=p, status="COMPLETED")
        rep = Report.objects.create(
            screening=sc,
            prediction="Severe",
            confidence=0.92,
            probabilities={"Severe": 0.92, "Moderate": 0.05, "Mild": 0.02, "No_DR": 0.01},
            retinal_analysis={"findings": ["Hemorrhages", "Hard Exudates"]}
        )
    test_ref = Referral.objects.create(
        report=rep,
        status="PENDING",
        assigned_doctor=None
    )
    print(f"Created temporary pending referral #{test_ref.id} (Prediction: {rep.prediction}) for testing")

print(f"\n--- Testing Atomic Case Claiming on Referral #{test_ref.id} ---")
# Claim as doc1
claim_request = rf.post(f'/api/referrals/{test_ref.id}/claim/')
force_authenticate(claim_request, user=doc1)
claim_view = ReferralClaimView.as_view()
claim_resp = claim_view(claim_request, pk=test_ref.id)
print(f"Doctor 1 Claim Status: {claim_resp.status_code}")
print(f"Response: {claim_resp.data.get('status')}, Assigned Doctor: {claim_resp.data.get('assigned_doctor')}")
assert claim_resp.status_code == 200, f"Expected 200 OK, got {claim_resp.status_code}"
assert claim_resp.data.get('assigned_doctor') == doc1.id
assert claim_resp.data.get('status') == "ASSIGNED"
assert claim_resp.data.get('available_for_claim') is False

# Attempt second claim as doc2 -> MUST return 409 Conflict
claim_request2 = rf.post(f'/api/referrals/{test_ref.id}/claim/')
force_authenticate(claim_request2, user=doc2)
claim_resp2 = claim_view(claim_request2, pk=test_ref.id)
print(f"Doctor 2 Concurrent Claim Status: {claim_resp2.status_code}")
print(f"Conflict response detail: {claim_resp2.data.get('detail')}")
assert claim_resp2.status_code == 409, f"Expected 409 Conflict, got {claim_resp2.status_code}"

# 5. Test Admin Reassignment
print(f"\n--- Testing Admin Manual Assignment on Referral #{test_ref.id} ---")
assign_req = rf.patch(
    f'/api/referrals/{test_ref.id}/assign-doctor/',
    data=json.dumps({"doctor_id": doc2.id}),
    content_type='application/json'
)
force_authenticate(assign_req, user=admin_user)
assign_view = ReferralAssignDoctorView.as_view()
assign_resp = assign_view(assign_req, pk=test_ref.id)
print(f"Admin Assign Status: {assign_resp.status_code}")
print(f"New Assigned Doctor: {assign_resp.data.get('assigned_doctor')}")
assert assign_resp.status_code == 200
assert assign_resp.data.get('assigned_doctor') == doc2.id

# 6. Test Doctor 1 my_cases vs Doctor 2 my_cases
req_my1 = rf.get('/api/referrals/?scope=my_cases')
force_authenticate(req_my1, user=doc1)
resp_my1 = view(req_my1)
ids_doc1 = [x['id'] for x in resp_my1.data]
print(f"Doctor 1 Assigned Cases count: {len(ids_doc1)}")
assert test_ref.id not in ids_doc1, "Referral reassigned to doc2 should not be in doc1's my_cases"

req_my2 = rf.get('/api/referrals/?scope=my_cases')
force_authenticate(req_my2, user=doc2)
resp_my2 = view(req_my2)
ids_doc2 = [x['id'] for x in resp_my2.data]
print(f"Doctor 2 Assigned Cases count: {len(ids_doc2)}")
assert test_ref.id in ids_doc2, "Referral assigned to doc2 must be in doc2's my_cases"

# Reset test_ref back to unassigned pending so doctor can claim it in the UI!
test_ref.assigned_doctor = None
test_ref.status = "PENDING"
test_ref.save(update_fields=['assigned_doctor', 'status'])
print(f"\nReset test referral #{test_ref.id} to PENDING / unassigned for UI browser verification.")
print("=== All automated backend assertions passed successfully! ===")
