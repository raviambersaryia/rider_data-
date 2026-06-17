import os
import sys
from datetime import datetime, date
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS

# Add the api directory and the root directory to python path for Vercel/serverless environments
api_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(api_dir, ".."))
if api_dir not in sys.path:
    sys.path.append(api_dir)
if root_dir not in sys.path:
    sys.path.append(root_dir)

from db_conn import get_connection, db_type, initialize_database

app = Flask(
    __name__,
    static_folder=os.path.join(root_dir, 'static'),
    template_folder=os.path.join(root_dir, 'templates')
)
CORS(app)

# Schema mappings between Frontend camelCase and Database snake_case columns

SQLITE_MAP = {
    'id': 'id',
    'brandName': 'brand_name',
    'storeName': 'store_name',
    'employeeNo': 'employee_no',
    'employeeName': 'employee_name',
    'employeeEmail': 'employee_email',
    'employeePhone': 'employee_phone',
    'employeeGender': 'employee_gender',
    'employeeDOB': 'employee_dob',
    'panNumber': 'pan_number',
    'employeeAddress': 'employee_address',
    'employeeCity': 'employee_city',
    'employeeState': 'employee_state',
    'employeePinCode': 'employee_pincode',
    'nomineeName': 'nominee_name',
    'nomineeGender': 'nominee_gender',
    'nomineeDOB': 'nominee_dob',
    'nomineeRelationship': 'nominee_relationship',
    'profilePhoto': 'profile_photo',
    'insuranceStatus': 'insurance_status',
    'insurancePolicyNumber': 'insurance_policy_number',
    'insuranceProvider': 'insurance_provider',
    'insuranceStartDate': 'insurance_start_date',
    'insuranceEndDate': 'insurance_end_date',
    'coverageAmount': 'coverage_amount',
    'insuranceEligibilityStatus': 'insurance_eligibility_status',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
}

POSTGRES_MAP = {
    'id': 'id',
    'brandName': 'brand_name',
    'storeName': 'store_name',
    'employeeNo': 'employee_no',
    'employeeName': 'employee_name',
    'employeeEmail': 'employee_email',
    'employeePhone': 'employee_mobile',
    'employeeGender': 'employee_gender',
    'employeeDOB': 'employee_dob',
    'panNumber': 'employee_pan',
    'employeeAddress': 'employee_address',
    'employeeCity': 'employee_city',
    'employeeState': 'employee_state',
    'employeePinCode': 'employee_pin_code',
    'nomineeName': 'nominee_name',
    'nomineeGender': 'nominee_gender',
    'nomineeDOB': 'nominee_dob',
    'nomineeRelationship': 'nominee_relationship',
    'profilePhoto': 'profile_photo',
    'insuranceStatus': 'insurance_status',
    'insurancePolicyNumber': 'insurance_policy_number',
    'insuranceProvider': 'insurance_provider',
    'insuranceStartDate': 'insurance_start_date',
    'insuranceEndDate': 'insurance_end_date',
    'coverageAmount': 'coverage_amount',
    'insuranceEligibilityStatus': 'insurance_eligibility_status',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at'
}


def get_mapping():
    return POSTGRES_MAP if db_type == 'postgres' else SQLITE_MAP


def get_placeholder():
    return '%s' if db_type == 'postgres' else '?'


def get_table_name():
    return 'rider_insurance_details' if db_type == 'postgres' else 'riders'


def to_db_dict(frontend_data):
    mapping = get_mapping()
    db_data = {}
    for fk, dbk in mapping.items():
        if fk in frontend_data:
            # Clean values
            val = frontend_data[fk]
            if isinstance(val, str):
                val = val.strip()
            # Enforce lowercase on gender columns to satisfy database check constraints
            if dbk in ('employee_gender', 'nominee_gender') and val:
                val = val.lower()
            db_data[dbk] = val
    return db_data


def to_frontend_dict(db_row_dict):
    mapping = get_mapping()
    reverse_map = {v: k for k, v in mapping.items()}
    frontend_data = {}
    for dbk, val in db_row_dict.items():
        fk = reverse_map.get(dbk, dbk)
        if fk == 'id' and val is not None:
            val = str(val)
        elif isinstance(val, (datetime, date)):
            val = val.isoformat()
        frontend_data[fk] = val
    return frontend_data


# Database Helper Operations

def db_fetch_all(table_name):
    query = f"SELECT * FROM {table_name} ORDER BY created_at DESC"
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(query)
            colnames = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            results = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(colnames):
                    row_dict[col] = row[i]
                results.append(row_dict)
            return results
        finally:
            cur.close()


def db_fetch_one(table_name, record_id):
    placeholder = get_placeholder()
    # Cast uuid parameter if needed in Postgres
    id_clause = f"id = {placeholder}::uuid" if db_type == 'postgres' else f"id = {placeholder}"
    query = f"SELECT * FROM {table_name} WHERE {id_clause}"
    
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(query, (record_id,))
            colnames = [desc[0] for desc in cur.description]
            row = cur.fetchone()
            if row:
                row_dict = {}
                for i, col in enumerate(colnames):
                    row_dict[col] = row[i]
                return row_dict
            return None
        finally:
            cur.close()


def db_insert(table_name, db_data):
    placeholder = get_placeholder()
    # Ensure created_at / updated_at are set
    db_data['created_at'] = datetime.now()
    db_data['updated_at'] = datetime.now()
    
    columns = list(db_data.keys())
    placeholders = [placeholder] * len(columns)
    
    query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({', '.join(placeholders)})"
    values = tuple(db_data[col] for col in columns)
    
    if db_type == 'postgres':
        query += " RETURNING id"
        
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(query, values)
            if db_type == 'postgres':
                row = cur.fetchone()
                record_id = row[0]
            else:
                record_id = cur.lastrowid
            conn.commit()
            return record_id
        finally:
            cur.close()


def db_update(table_name, db_data, record_id):
    placeholder = get_placeholder()
    db_data['updated_at'] = datetime.now()
    
    # Remove id and created_at if they exist
    db_data = {k: v for k, v in db_data.items() if k not in ('id', 'created_at')}
    
    columns = list(db_data.keys())
    set_clause = ", ".join([f"{col} = {placeholder}" for col in columns])
    
    id_clause = f"id = {placeholder}::uuid" if db_type == 'postgres' else f"id = {placeholder}"
    query = f"UPDATE {table_name} SET {set_clause} WHERE {id_clause}"
    values = tuple(list(db_data.values()) + [record_id])
    
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(query, values)
            conn.commit()
            return cur.rowcount > 0
        finally:
            cur.close()


def db_delete(table_name, record_id):
    placeholder = get_placeholder()
    id_clause = f"id = {placeholder}::uuid" if db_type == 'postgres' else f"id = {placeholder}"
    query = f"DELETE FROM {table_name} WHERE {id_clause}"
    
    with get_connection() as conn:
        cur = conn.cursor()
        try:
            cur.execute(query, (record_id,))
            conn.commit()
            return cur.rowcount > 0
        finally:
            cur.close()


# ==================== API Routes ====================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'db_type': db_type,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics calculated robustly in Python"""
    try:
        all_riders = [to_frontend_dict(r) for r in db_fetch_all(get_table_name())]
        
        total_riders = len(all_riders)
        active_riders = sum(1 for r in all_riders if r.get('insuranceStatus') == 'active')
        pending_insurance = sum(1 for r in all_riders if r.get('insuranceStatus') == 'pending')
        completed_insurance = sum(1 for r in all_riders if r.get('insuranceStatus') == 'completed')
        
        # Calculate expiring policies (active and ending in <= 30 days)
        now = datetime.now()
        expiring_policies = 0
        for r in all_riders:
            if r.get('insuranceStatus') == 'active' and r.get('insuranceEndDate'):
                try:
                    end_date = datetime.strptime(r['insuranceEndDate'], '%Y-%m-%d')
                    days_remaining = (end_date - now).days + 1
                    if 0 <= days_remaining <= 30:
                        expiring_policies += 1
                except Exception:
                    pass
                    
        # Calculate recently activated policies (active and updated in the last 7 days)
        recently_activated = 0
        for r in all_riders:
            if r.get('insuranceStatus') == 'active':
                date_str = r.get('updatedAt') or r.get('createdAt')
                if date_str:
                    try:
                        date_str_clean = date_str.replace('T', ' ').split('.')[0]
                        updated_time = datetime.strptime(date_str_clean, '%Y-%m-%d %H:%M:%S')
                        if (now - updated_time).days <= 7:
                            recently_activated += 1
                    except Exception:
                        try:
                            updated_time = datetime.strptime(date_str.split(' ')[0], '%Y-%m-%d')
                            if (now - updated_time).days <= 7:
                                recently_activated += 1
                        except Exception:
                            pass
                            
        return jsonify({
            'success': True,
            'total_riders': total_riders,
            'active_riders': active_riders,
            'pending_insurance': pending_insurance,
            'completed_insurance': completed_insurance,
            'expiring_policies': expiring_policies,
            'recently_activated': recently_activated
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/riders', methods=['GET'])
def get_riders():
    """Get all riders"""
    try:
        rows = db_fetch_all(get_table_name())
        riders = [to_frontend_dict(row) for row in rows]
        return jsonify({
            'success': True,
            'data': riders,
            'count': len(riders)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/riders/<rider_id>', methods=['GET'])
def get_rider(rider_id):
    """Get a specific rider"""
    try:
        row = db_fetch_one(get_table_name(), rider_id)
        if row:
            return jsonify({
                'success': True,
                'data': to_frontend_dict(row)
            })
        return jsonify({'success': False, 'error': 'Rider not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/riders', methods=['POST'])
def create_rider():
    """Create a new rider"""
    try:
        data = request.get_json() or {}
        db_data = to_db_dict(data)
        
        # Validation checks
        if not db_data.get('brand_name') or not db_data.get('store_name') or not db_data.get('employee_no'):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
            
        # Set sensible defaults for insurance and profile photo fields not present in form
        db_data.setdefault('insurance_status', 'pending')
        db_data.setdefault('insurance_policy_number', '')
        db_data.setdefault('insurance_provider', '')
        db_data.setdefault('insurance_start_date', '')
        db_data.setdefault('insurance_end_date', '')
        db_data.setdefault('coverage_amount', '0')
        db_data.setdefault('insurance_eligibility_status', 'pending')
        db_data.setdefault('profile_photo', '')

        record_id = db_insert(get_table_name(), db_data)
        return jsonify({
            'success': True,
            'id': str(record_id),
            'message': 'Rider created successfully'
        }), 201
    except Exception as e:
        # Check integrity constraint error (SQLite or Postgres)
        err_msg = str(e).lower()
        if 'unique' in err_msg or 'duplicate' in err_msg:
            return jsonify({'success': False, 'error': 'Employee number already exists'}), 400
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/riders/<rider_id>', methods=['PUT'])
def update_rider_route(rider_id):
    """Update a rider"""
    try:
        data = request.get_json() or {}
        db_data = to_db_dict(data)
        
        success = db_update(get_table_name(), db_data, rider_id)
        if success:
            return jsonify({
                'success': True,
                'message': 'Rider updated successfully'
            })
        return jsonify({'success': False, 'error': 'Rider not found or no changes made'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/riders/<rider_id>', methods=['DELETE'])
def delete_rider_route(rider_id):
    """Delete a rider"""
    try:
        success = db_delete(get_table_name(), rider_id)
        if success:
            return jsonify({
                'success': True,
                'message': 'Rider deleted successfully'
            })
        return jsonify({'success': False, 'error': 'Rider not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/search', methods=['POST'])
def search_riders():
    """Search riders by various criteria"""
    try:
        data = request.get_json() or {}
        search_term = data.get('query', '').lower()
        status_filter = data.get('status', 'all')
        
        all_riders = [to_frontend_dict(r) for r in db_fetch_all(get_table_name())]
        
        filtered = []
        for r in all_riders:
            matches_search = not search_term or any(
                search_term in str(r.get(k, '')).lower()
                for k in ['employeeName', 'employeeEmail', 'employeeNo', 'employeePhone', 'brandName', 'storeName']
            )
            matches_status = status_filter == 'all' or r.get('insuranceStatus') == status_filter
            
            if matches_search and matches_status:
                filtered.append(r)
                
        return jsonify({
            'success': True,
            'data': filtered,
            'count': len(filtered)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==================== Static Frontend Serving ====================


@app.route('/', methods=['GET'])
@app.route('/index.html', methods=['GET'])
def serve_index():
    """Render and serve index.html template"""
    return render_template('index.html')


@app.route('/rider-profile.html', methods=['GET'])
def serve_profile():
    """Render and serve rider-profile.html template"""
    return render_template('rider-profile.html')


@app.route('/security.html', methods=['GET'])
@app.route('/security', methods=['GET'])
def serve_security():
    """Render and serve security.html template"""
    return render_template('security.html')



@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    # Initialize connection and databases
    initialize_database()
    
    port = int(os.getenv('FLASK_PORT', 5001))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    
    print(f"Starting Rider Insurance Server on http://localhost:{port}")
    print(f"Serving static files from: {app.static_folder}")
    print(f"Database Mode: {db_type.upper()}")
    app.run(host='0.0.0.0', port=port, debug=debug)
